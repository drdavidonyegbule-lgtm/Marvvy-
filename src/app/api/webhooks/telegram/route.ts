import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramWebhook } from '@/lib/channels/telegram';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const result = await handleTelegramWebhook(update);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    setup: 'Set webhook: POST https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://yourdomain.com/api/webhooks/telegram',
  });
}
