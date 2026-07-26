import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const db = getDb();
  const channels = db.prepare('SELECT * FROM channel_configs').all();
  return NextResponse.json({ channels });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { channelType, config, isActive } = body;
    const db = getDb();

    if (!channelType || !config) {
      return NextResponse.json({ error: 'channelType and config required' }, { status: 400 });
    }

    const existing = db
      .prepare('SELECT id FROM channel_configs WHERE channel_type = ?')
      .get(channelType) as any;

    if (existing) {
      db.prepare(
        `UPDATE channel_configs SET config = ?, is_active = ?, updated_at = datetime('now') WHERE channel_type = ?`
      ).run(JSON.stringify(config), isActive ? 1 : 0, channelType);
    } else {
      db.prepare(
        `INSERT INTO channel_configs (id, channel_type, config, is_active)
         VALUES (?, ?, ?, ?)`
      ).run(uuid(), channelType, JSON.stringify(config), isActive ? 1 : 0);
    }

    const saved = db.prepare('SELECT * FROM channel_configs WHERE channel_type = ?').get(channelType);

    let webhookUrl = '';
    if (channelType === 'telegram') {
      webhookUrl = `https://api.telegram.org/bot${config.botToken}/setWebhook?url=${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://yourdomain.com'}/api/webhooks/telegram`;
    } else if (channelType === 'whatsapp') {
      webhookUrl = `Set in Twilio Console → Messaging → WhatsApp Senders → "When a message comes in" → ${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://yourdomain.com'}/api/webhooks/whatsapp`;
    }

    return NextResponse.json({
      success: true,
      channel: saved,
      webhookSetup: webhookUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
