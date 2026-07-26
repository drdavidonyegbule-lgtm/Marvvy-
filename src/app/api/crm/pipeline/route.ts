import { getDb } from '@/lib/db/schema';

export async function GET() {
  const db = getDb();
  const allDeals = db.prepare('SELECT * FROM deals').all() as any[];

  // Aggregate by stage in JS (replaces GROUP BY)
  const stageMap: Record<string, { count: number; total_value: number; probabilities: number[] }> = {};
  for (const deal of allDeals) {
    const stage = deal.stage || 'unknown';
    if (!stageMap[stage]) stageMap[stage] = { count: 0, total_value: 0, probabilities: [] };
    stageMap[stage].count++;
    stageMap[stage].total_value += Number(deal.value) || 0;
    stageMap[stage].probabilities.push(Number(deal.probability) || 0);
  }

  const stages = Object.entries(stageMap)
    .map(([stage, data]) => ({
      stage,
      count: data.count,
      total_value: data.total_value,
      avg_probability: data.probabilities.length > 0
        ? Math.round(data.probabilities.reduce((a, b) => a + b, 0) / data.probabilities.length)
        : 0,
    }))
    .sort((a, b) => b.total_value - a.total_value);

  const totalValue = stages.reduce((sum, s) => sum + s.total_value, 0);
  const totalDeals = stages.reduce((sum, s) => sum + s.count, 0);

  return Response.json({ stages, totalValue, totalDeals, deals: allDeals });
}
