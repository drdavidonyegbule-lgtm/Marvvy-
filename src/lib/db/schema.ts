/**
 * Simple JSON-file database. Works on Vercel serverless + local dev.
 * Replaces better-sqlite3 which doesn't work on Vercel serverless.
 */
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join('/tmp', 'marvvy.json');

type Row = Record<string, unknown>;

interface TableStore {
  name: string;
  rows: Row[];
}

let store: { tables: Record<string, TableStore> } | null = null;

function load() {
  if (store) return store.tables;
  try {
    if (fs.existsSync(DB_PATH)) {
      store = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
  } catch { /* fresh start */ }
  if (!store) store = { tables: {} };
  ensureTables();
  return store.tables;
}

function persist() {
  if (store) fs.writeFileSync(DB_PATH, JSON.stringify(store), 'utf-8');
}

function ensureTables() {
  const names = [
    'customers', 'conversations', 'messages', 'leads', 'deals',
    'tasks', 'workflows', 'knowledge_articles', 'doc_chunks',
    'agent_memories', 'admins', 'channel_configs',
  ];
  for (const name of names) {
    if (!store!.tables[name]) store!.tables[name] = { name, rows: [] };
  }
}

function nowISO() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// ─── STATEMENT ──────────────────────────────────────────────

class Statement {
  private sql: string;
  private tableName: string;

  constructor(sql: string) {
    this.sql = sql;
    const m = sql.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i);
    this.tableName = m ? m[1] : '';
  }

  // ─── run — INSERT / UPDATE / DELETE ──────────────────────

  run(...values: unknown[]): { changes: number } {
    const sqlUp = this.sql.toUpperCase().trim();
    const tables = load();

    if (sqlUp.startsWith('INSERT')) {
      const m = this.sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (!m) return { changes: 0 };
      const tableName = m[1];
      const cols = m[2].split(',').map(c => c.trim().replace(/["`]/g, ''));
      const row: Row = {};
      cols.forEach((col, i) => { row[col] = values[i] ?? null; });
      if (!row.created_at) row.created_at = nowISO();
      if (cols.includes('updated_at') && !row.updated_at) row.updated_at = nowISO();
      tables[tableName].rows.push(row);
      persist();
      return { changes: 1 };
    }

    if (sqlUp.startsWith('UPDATE')) {
      const setIdx = sqlUp.indexOf('SET') + 3;
      const whereIdx = sqlUp.indexOf('WHERE');
      const setPart = this.sql.substring(setIdx, whereIdx > -1 ? whereIdx : undefined).trim();
      const wherePart = whereIdx > -1 ? this.sql.substring(whereIdx + 5).trim() : '';

      // Count ? in SET part
      const setQs = (setPart.match(/\?/g) || []).length;
      const setVals = values.slice(0, setQs);
      const whereVals = values.slice(setQs);

      // Extract column names from SET (col = ? or col = expr)
      const setCols: string[] = setPart.split(',').map(c => c.trim().split(/[=\s]/)[0]).filter(Boolean);

      let count = 0;
      for (const row of tables[this.tableName].rows) {
        if (!wherePart || this.matchWhere(row, wherePart, whereVals)) {
          setCols.forEach((col, i) => {
            if (setVals[i] !== undefined) row[col] = setVals[i];
          });
          row.updated_at = nowISO();
          count++;
        }
      }
      persist();
      return { changes: count };
    }

    if (sqlUp.startsWith('DELETE')) {
      const whereIdx = sqlUp.indexOf('WHERE');
      if (whereIdx > -1) {
        const wherePart = this.sql.substring(whereIdx + 5).trim();
        const before = tables[this.tableName].rows.length;
        tables[this.tableName].rows = tables[this.tableName].rows.filter(
          r => !this.matchWhere(r, wherePart, values)
        );
        persist();
        return { changes: before - tables[this.tableName].rows.length };
      }
      return { changes: 0 };
    }

    return { changes: 0 };
  }

  // ─── all — SELECT → multiple rows ─────────────────────────

  all(...values: unknown[]): Row[] {
    const tables = load();
    let rows = [...tables[this.tableName].rows];

    const sqlUp = this.sql.toUpperCase();
    const whereIdx = sqlUp.indexOf('WHERE');
    const orderIdx = sqlUp.indexOf('ORDER BY');
    const limitIdx = sqlUp.indexOf('LIMIT');
    const groupIdx = sqlUp.indexOf('GROUP BY');

    // WHERE
    let wherePart = '';
    if (whereIdx > -1) {
      const end = Math.min(
        ...[orderIdx, limitIdx, groupIdx, sqlUp.length].filter(i => i > whereIdx)
      );
      wherePart = this.sql.substring(whereIdx + 5, end).trim();
    }

    // ORDER
    let orderCol = '';
    let orderDesc = false;
    if (orderIdx > -1) {
      const end = Math.min(
        ...[limitIdx, groupIdx, sqlUp.length].filter(i => i > orderIdx)
      );
      const orderRaw = this.sql.substring(orderIdx + 8, end).trim();
      const parts = orderRaw.split(/\s+/);
      orderCol = parts[0];
      orderDesc = parts[1]?.toUpperCase() === 'DESC';
    }

    // LIMIT
    let limit = Infinity;
    if (limitIdx > -1) {
      const limitRaw = this.sql.substring(limitIdx + 5).trim().split(/\s/)[0];
      limit = parseInt(limitRaw) || Infinity;
    }

    // Apply WHERE
    if (wherePart) {
      rows = rows.filter(r => this.matchWhere(r, wherePart, values));
    }

    // Apply ORDER
    if (orderCol) {
      rows.sort((a, b) => {
        const av = a[orderCol] ?? '', bv = b[orderCol] ?? '';
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return orderDesc ? -cmp : cmp;
      });
    }

    // Apply LIMIT
    return rows.slice(0, limit);
  }

  // ─── get — SELECT → single row ────────────────────────────

  get(...values: unknown[]): Row | undefined {
    return this.all(...values)[0];
  }

  // ─── WHERE evaluator ──────────────────────────────────────

  private matchWhere(row: Row, whereClause: string, values: unknown[]): boolean {
    const conditions = whereClause.split(/\s+AND\s+/i).map(c => c.trim());
    let vi = 0;

    for (const cond of conditions) {
      // col = ?
      const eq = cond.match(/^(\w+)\s*=\s*\?$/);
      if (eq) {
        if (String(row[eq[1]] ?? '') !== String(values[vi] ?? '')) return false;
        vi++;
        continue;
      }

      // col LIKE ?
      const like = cond.match(/^(\w+)\s+LIKE\s*\?$/);
      if (like) {
        const needle = String(values[vi] ?? '').replace(/%/g, '');
        if (!String(row[like[1]] ?? '').toLowerCase().includes(needle.toLowerCase())) return false;
        vi++;
        continue;
      }

      // col IS NOT NULL
      const notNull = cond.match(/^(\w+)\s+IS\s+NOT\s+NULL$/i);
      if (notNull) {
        if (row[notNull[1]] == null) return false;
        continue;
      }

      // datetime() function — skip, always match
      if (/datetime\(/.test(cond)) continue;

      // Raw comparison: col op literal
      const cmp = cond.match(/^(\w+)\s*(=|!=|>|<)\s*(.+)$/);
      if (cmp) {
        const col = cmp[1], op = cmp[2], lit = cmp[3].replace(/'/g, '');
        const rv = String(row[col] ?? '');
        if (op === '=' && rv !== lit) return false;
        if (op === '!=' && rv === lit) return false;
        if (op === '>' && Number(rv) <= Number(lit)) return false;
        if (op === '<' && Number(rv) >= Number(lit)) return false;
        continue;
      }
    }
    return true;
  }
}

// ─── PUBLIC API ────────────────────────────────────────────────

export function getDb() {
  load();
  return {
    prepare: (sql: string) => new Statement(sql),
    exec: () => {},
    pragma: () => {},
    close: () => {},
  };
}

export function closeDb() {}
