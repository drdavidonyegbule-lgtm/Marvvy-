import { getMarvvyResponse } from '@/lib/agents/orchestrator';

export async function POST(req: Request) {
  const body = await req.json();
  const { action, ...params } = body;

  // Route consulting requests through Marvvy with a consulting-focused prompt
  const promptMap: Record<string, string> = {
    research: `Conduct research on: ${params.topic}. Depth: ${params.depth || 'detailed'}. Focus areas: ${params.focusAreas?.join(', ') || 'general'}.`,
    analyze: `Analyze this data: ${params.dataDescription}. Type: ${params.analysisType}.`,
    strategy: `Generate a strategy for this context: ${params.context}. Goals: ${params.goals?.join(', ')}. Timeframe: ${params.timeframe || '12 months'}.`,
    swot: `Perform a SWOT analysis for: ${params.entity} in the ${params.industry || 'general'} industry.`,
    recommend: `Generate recommendations for: ${params.context}. Area: ${params.area}.`,
  };

  const message = promptMap[action] || `Help me with: ${JSON.stringify(params)}`;

  const result = await getMarvvyResponse({
    message,
    channelType: 'web',
  });

  return Response.json(result);
}
