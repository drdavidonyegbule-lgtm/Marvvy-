import { NextRequest, NextResponse } from 'next/server';
import { handleWhatsAppWebhook } from '@/lib/channels/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });

    const result = await handleWhatsAppWebhook(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    setup: 'Set this URL as your Twilio WhatsApp webhook in the Twilio Console.',
    requiresEnv: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_NUMBER'],
  });
}
