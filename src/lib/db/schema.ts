import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'marvvy.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    -- ─── CORE CRM ──────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      role TEXT,
      tags TEXT,
      preferences TEXT,
      lifetime_value REAL DEFAULT 0,
      channel_origin TEXT DEFAULT 'web',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id),
      subject TEXT,
      status TEXT DEFAULT 'active',
      channel_origin TEXT DEFAULT 'web',
      priority INTEGER DEFAULT 1,
      sentiment_score REAL,
      -- Handoff fields
      handoff_status TEXT DEFAULT 'agent',
      handoff_admin_id TEXT,
      handoff_started_at TEXT,
      last_human_message_at TEXT,
      handoff_timeout_minutes INTEGER DEFAULT 10,
      --
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT REFERENCES conversations(id),
      channel_type TEXT DEFAULT 'web',
      direction TEXT NOT NULL,
      content TEXT NOT NULL,
      content_type TEXT DEFAULT 'text',
      agent_id TEXT,
      tool_calls TEXT,
      reflection_score REAL,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── CRM PIPELINE ──────────────────────────────────────

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id),
      source TEXT DEFAULT 'direct',
      status TEXT DEFAULT 'new',
      score INTEGER DEFAULT 0,
      assigned_to TEXT,
      pipeline_stage TEXT DEFAULT 'new',
      expected_value REAL DEFAULT 0,
      converted_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      lead_id TEXT REFERENCES leads(id),
      customer_id TEXT REFERENCES customers(id),
      name TEXT NOT NULL,
      stage TEXT DEFAULT 'discovery',
      value REAL DEFAULT 0,
      probability REAL DEFAULT 0,
      close_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── OPERATIONS ────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to TEXT,
      status TEXT DEFAULT 'pending',
      priority INTEGER DEFAULT 2,
      due_date TEXT,
      workflow_id TEXT,
      parent_task_id TEXT REFERENCES tasks(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      definition TEXT,
      trigger_type TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── KNOWLEDGE BASE ────────────────────────────────────

    CREATE TABLE IF NOT EXISTS knowledge_articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      tags TEXT,
      source_url TEXT,
      confidence REAL DEFAULT 1.0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS doc_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT,
      chunk_index INTEGER,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── MEMORY ────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS agent_memories (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id),
      event_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      importance REAL DEFAULT 0.5,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── AUTH: SUPER ADMINS ────────────────────────────────

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT,
      role TEXT DEFAULT 'super_admin',
      api_token TEXT UNIQUE,
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── CHANNEL CONFIGS ───────────────────────────────────

    CREATE TABLE IF NOT EXISTS channel_configs (
      id TEXT PRIMARY KEY,
      channel_type TEXT UNIQUE NOT NULL,
      config TEXT NOT NULL,
      webhook_url TEXT,
      is_active INTEGER DEFAULT 0,
      last_verified TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── INDEXES ───────────────────────────────────────────

    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_leads_customer ON leads(customer_id);
    CREATE INDEX IF NOT EXISTS idx_deals_customer ON deals(customer_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_memories_customer ON agent_memories(customer_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_document ON doc_chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_conv_handoff ON conversations(handoff_status);
    CREATE INDEX IF NOT EXISTS idx_conv_channel ON conversations(channel_origin);
  `);
}

export function closeDb() {
  if (db) {
    db.close();
  }
}
