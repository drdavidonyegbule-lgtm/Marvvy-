import { getDb } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || '';
  const limit = parseInt(searchParams.get('limit') || '20');

  const db = getDb();
  const contacts = query
    ? db.prepare(
        `SELECT * FROM customers WHERE name LIKE ? OR email LIKE ? OR company LIKE ? LIMIT ?`
      ).all(`%${query}%`, `%${query}%`, `%${query}%`, limit)
    : db.prepare('SELECT * FROM customers ORDER BY created_at DESC LIMIT ?').all(limit);

  return Response.json({ contacts });
}

export async function POST(req: Request) {
  const body = await req.json();
  const db = getDb();
  const id = uuid();

  db.prepare(
    `INSERT INTO customers (id, name, email, phone, company, role, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, body.name, body.email || null, body.phone || null, body.company || null, body.role || null, body.tags || null);

  const contact = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  return Response.json({ contact }, { status: 201 });
}
