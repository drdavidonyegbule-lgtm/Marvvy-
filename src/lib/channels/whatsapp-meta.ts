/**
 * WhatsApp Cloud API (Meta Direct) Channel Handler.
 *
 * NO Twilio needed. Uses Meta's hosted WhatsApp Business API directly.
 *
 * Setup:
 * 1. Create a Meta App at developers.facebook.com
 * 2. Add WhatsApp product to the app
 * 3. Get phone number ID and access token
 * 4. Add to Vercel env vars: META_WHATSAPP_TOKEN, META_WHATSAPP_PHONE_ID
 * 5. Set webhook callback URL: https://yourdomain.com/api/webhooks/whatsapp/meta
 */

import { getDb } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';
import { getMarvvyResponse } from '@/lib/agents/orchestrator';

const META_API = 'https://graph.facebook.com/v22.0';

interface MetaWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: Array<{ profile: { name: string }; wa_id: string }>;
      messages?: Array<{
        id: string;
        from: string;
        text?: { body: string };
        type: string;
        timestamp: string;
      }>;
    };
  }>;
}

export async function handleMetaWhatsAppWebhook(body: { entry?: MetaWebhookEntry[] }) {
  if (!body.entry?.[0]?.changes?.[0]) return { ok: true };

  const change = body.entry[0].changes[0];
  const msg = change.value.messages?.[0];
  const contact = change.value.contacts?.[0];

  if (!msg?.text?.body) return { ok: true };

  const text = msg.text.body;
  const from = msg.from;
  const profileName = contact?.profile?.name || 'WhatsApp User';

  const db = getDb();
  let customer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(from) as any;

  if (!customer) {
    const custId = uuid();
    db.prepare(
      `INSERT INTO customers (id, name, phone, channel_origin)
       VALUES (?, ?, ?, 'whatsapp')`
    ).run(custId, profileName, from);
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

  if (activeConv?.handoff_status === 'human' && isHandoffTimedOut(activeConv)) {
    db.prepare(
      "UPDATE conversations SET handoff_status = 'agent', handoff_admin_id = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(activeConv.id);
  }

  try {
    const response = await getMarvvyResponse({
      message: text,
      conversationId: activeConv?.id,
      customerId: customer.id,
      channelType: 'whatsapp',
    });

    // Send via Meta API
    await sendMetaWhatsAppMessage(from, response.text);

    return { ok: true, responded: true, responseId: response.conversationId };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function sendMetaWhatsAppMessage(to: string, text: string) {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    console.warn('META_WHATSAPP_TOKEN or META_WHATSAPP_PHONE_ID not set — cannot send');
    return;
  }

  await fetch(`${META_API}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text.substring(0, 4096) },
    }),
  });
}

function shouldMarvvyRespond(db: ReturnType<typeof getDb>, conv: any): boolean {
  if (!conv) return true;
  if (conv.handoff_status === 'agent') return true;
  if (conv.handoff_status === 'human') return isHandoffTimedOut(conv);
  return true;
}

function isHandoffTimedOut(conv: any): boolean {
  if (!conv.last_human_message_at) return false;
  const lastMessage = new Date(conv.last_human_message_at + 'Z').getTime();
  const now = Date.now();
  const timeoutMs = (conv.handoff_timeout_minutes || 10) * 60 * 1000;
  return now - lastMessage > timeoutMs;
}
