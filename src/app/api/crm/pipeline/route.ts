import { getDb } from '@/lib/db/schema';

export async function GET() {
  const db = getDb();
  const stages = db.prepare(
    `SELECT stage, COUNT(*) as count, SUM(value) as total_value, AVG(probability) as avg_probability
     FROM deals GROUP BY stage ORDER BY total_value DESC`
  ).all();

  const totalValue = (stages as any[]).reduce((sum: number, s: any) => sum + (s.total_value || 0), 0);
  const totalDeals = (stages as any[]).reduce((sum: number, s: any) => sum + s.count, 0);
  const deals = db.prepare('SELECT * FROM deals ORDER BY created_at DESC').all();

  return Response.json({ stages, totalValue, totalDeals, deals });
}
