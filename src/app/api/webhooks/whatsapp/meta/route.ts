import { NextRequest, NextResponse } from 'next/server';
import { handleMetaWhatsAppWebhook } from '@/lib/channels/whatsapp-meta';

/**
 * Meta WhatsApp Cloud API webhook (NO Twilio needed).
 *
 * Webhook URL for Meta: https://yourdomain.com/api/webhooks/whatsapp/meta
 *
 * Meta sends:
 * - GET for verification (must return hub.challenge)
 * - POST for incoming messages
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN || 'marvvy-webhook';

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await handleMetaWhatsAppWebhook(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Meta WhatsApp webhook error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
