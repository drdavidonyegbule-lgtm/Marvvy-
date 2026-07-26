import { getDb } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '20');

  const db = getDb();
  const sql = status
    ? 'SELECT * FROM tasks WHERE status = ? ORDER BY priority DESC, created_at DESC LIMIT ?'
    : 'SELECT * FROM tasks ORDER BY priority DESC, created_at DESC LIMIT ?';
  const params = status ? [status, limit] : [limit];
  const tasks = db.prepare(sql).all(...params);

  return Response.json({ tasks });
}

export async function POST(req: Request) {
  const body = await req.json();
  const db = getDb();
  const id = uuid();

  db.prepare(
    `INSERT INTO tasks (id, title, description, assigned_to, priority, due_date)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, body.title, body.description || null, body.assignedTo || null, body.priority || 2, body.dueDate || null);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  return Response.json({ task }, { status: 201 });
}
