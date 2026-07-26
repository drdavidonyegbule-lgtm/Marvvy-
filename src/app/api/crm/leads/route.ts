import { getDb } from '@/lib/db/schema';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '20');

  const db = getDb();
  const sql = status
    ? 'SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC LIMIT ?'
    : 'SELECT * FROM leads ORDER BY created_at DESC LIMIT ?';
  const params = status ? [status, limit] : [limit];
  const leads = db.prepare(sql).all(...params);

  return Response.json({ leads });
}
