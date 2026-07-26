/**
 * WhatsApp Business Channel Handler (via Twilio).
 *
 * Setup:
 * 1. Get a Twilio account and WhatsApp sender number
 * 2. Configure webhook in Twilio Console → Messaging → WhatsApp Senders
 * 3. Webhook URL: https://yourdomain.com/api/webhooks/whatsapp
 * 4. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER to Vercel env vars
 */

import { getDb } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';
import { getMarvvyResponse } from '@/lib/agents/orchestrator';

const TWILIO_API = 'https://api.twilio.com/2010-04-01';

interface WhatsAppWebhookBody {
  Body?: string;
  From?: string;
  To?: string;
  MessageSid?: string;
  ProfileName?: string;
  WaId?: string;
}

export async function handleWhatsAppWebhook(body: WhatsAppWebhookBody) {
  const text = body.Body;
  const from = body.From || ''; // e.g. "whatsapp:+2348012345678"
  const profileName = body.ProfileName || 'WhatsApp User';

  if (!text) return { ok: true, reason: 'no_text' };

  // Normalize phone number
  const phone = from.replace('whatsapp:', '');

  const db = getDb();
  let customer = db
    .prepare('SELECT id FROM customers WHERE phone = ?')
    .get(phone) as any;

  if (!customer) {
    const custId = uuid();
    db.prepare(
      `INSERT INTO customers (id, name, phone, channel_origin)
       VALUES (?, ?, ?, 'whatsapp')`
    ).run(custId, profileName, phone);
    customer = { id: custId };
  }

  // Handoff check
  const activeConv = db
    .prepare(
      `SELECT id, handoff_status, last_human_message_at, handoff_timeout_minutes
       FROM conversations
       WHERE customer_id = ? AND status = 'active' AND channel_origin = 'whatsapp'
       ORDER BY updated_at DESC LIMIT 1`
    )
    .get(customer.id) as any;

  const shouldRespond = shouldMarvvyRespond(db, activeConv);

  if (!shouldRespond) {
    const convId = activeConv?.id || uuid();
    db.prepare(
      `INSERT INTO messages (id, conversation_id, channel_type, direction, content)
       VALUES (?, ?, 'whatsapp', 'inbound', ?)`
    ).run(uuid(), convId, text);

    if (activeConv) {
      db.prepare(
        "UPDATE conversations SET last_human_message_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).run(activeConv.id);
    }

    return { ok: true, handled: false, reason: 'human_has_control' };
  }

  // Auto-resume on timeout
  if (activeConv?.handoff_status === 'human' && isHandoffTimedOut(activeConv)) {
    db.prepare(
      "UPDATE conversations SET handoff_status = 'agent', handoff_admin_id = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(activeConv.id);
  }

  // Get Marvvy response — include lead qualification for new contacts
  try {
    const response = await getMarvvyResponse({
      message: text,
      conversationId: activeConv?.id,
      customerId: customer.id,
      channelType: 'whatsapp',
    });

    // Send via Twilio
    const twilioConfig = getTwilioConfig();
    if (twilioConfig) {
      await sendWhatsAppMessage(twilioConfig, phone, response.text);
    }

    return { ok: true, responded: true, responseId: response.conversationId };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function sendWhatsAppMessage(
  config: { accountSid: string; authToken: string; fromNumber: string },
  to: string,
  text: string
) {
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

  await fetch(
    `${TWILIO_API}/Accounts/${config.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: `whatsapp:${config.fromNumber}`,
        To: `whatsapp:${to}`,
        Body: text.substring(0, 1600),
      }).toString(),
    }
  );
}

function getTwilioConfig(): { accountSid: string; authToken: string; fromNumber: string } | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const number = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!sid || !token || !number) return null;
  return { accountSid: sid, authToken: token, fromNumber: number };
}

function shouldMarvvyRespond(db: ReturnType<typeof getDb>, conv: any): boolean {
  if (!conv) return true;
  if (conv.handoff_status === 'agent') return true;
  if (conv.handoff_status === 'human') {
    return isHandoffTimedOut(conv);
  }
  return true;
}

function isHandoffTimedOut(conv: any): boolean {
  if (!conv.last_human_message_at) return false;
  const lastMessage = new Date(conv.last_human_message_at + 'Z').getTime();
  const now = Date.now();
  const timeoutMs = (conv.handoff_timeout_minutes || 10) * 60 * 1000;
  return now - lastMessage > timeoutMs;
}
