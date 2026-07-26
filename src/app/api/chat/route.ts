import { streamMarvvyResponse, getMarvvyResponse } from '@/lib/agents/orchestrator';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, conversationId, customerId, channelType, stream = true } = body;

    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    if (stream) {
      const result = await streamMarvvyResponse({
        message,
        conversationId,
        customerId,
        channelType: channelType || 'web',
      });

      return result.toTextStreamResponse();
    }

    const result = await getMarvvyResponse({
      message,
      conversationId,
      customerId,
      channelType: channelType || 'web',
    });

    return Response.json(result);
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
