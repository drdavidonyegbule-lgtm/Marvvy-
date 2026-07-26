/**
 * Telegram Bot Channel Handler.
 *
 * Setup:
 * 1. Create a bot via @BotFather on Telegram → get BOT_TOKEN
 * 2. Set webhook: POST https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://yourdomain.com/api/webhooks/telegram
 * 3. Add BOT_TOKEN to your channel configs
 */

import { getDb } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';
import { getMarvvyResponse } from '@/lib/agents/orchestrator';

const TELEGRAM_API = 'https://api.telegram.org';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; first_name?: string; last_name?: string; username?: string };
    text?: string;
    contact?: { phone_number: string; first_name: string };
  };
}

export async function handleTelegramWebhook(update: TelegramUpdate) {
  const msg = update.message;
  if (!msg?.text) return { ok: true };

  const chatId = msg.chat.id;
  const customerName = msg.chat.first_name || msg.chat.username || 'Telegram User';
  const text = msg.text;

  // Get or create customer
  const db = getDb();
  let customer = db
    .prepare('SELECT id FROM customers WHERE phone = ? OR preferences LIKE ?')
    .get(`tg:${chatId}`, `%tg:${chatId}%`) as any;

  if (!customer) {
    const custId = uuid();
    db.prepare(
      `INSERT INTO customers (id, name, channel_origin, preferences)
       VALUES (?, ?, 'telegram', ?)`
    ).run(custId, customerName, JSON.stringify({ telegramChatId: chatId }));
    customer = { id: custId };
  }

  // Check if Marvvy should respond (handoff check)
  const activeConv = db
    .prepare(
      `SELECT id, handoff_status, last_human_message_at, handoff_timeout_minutes
       FROM conversations
       WHERE customer_id = ? AND status = 'active' AND channel_origin = 'telegram'
       ORDER BY updated_at DESC LIMIT 1`
    )
    .get(customer.id) as any;

  const shouldRespond = shouldMarvvyRespond(db, activeConv);

  if (!shouldRespond) {
    // Human is handling — store message silently
    const convId = activeConv?.id || uuid();
    db.prepare(
      `INSERT INTO messages (id, conversation_id, channel_type, direction, content)
       VALUES (?, ?, 'telegram', 'inbound', ?)`
    ).run(uuid(), convId, text);

    if (activeConv) {
      db.prepare(
        "UPDATE conversations SET last_human_message_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).run(activeConv.id);
    }

    return { ok: true, handled: false, reason: 'human_has_control' };
  }

  // Auto-resume if timeout reached
  if (activeConv?.handoff_status === 'human' && isHandoffTimedOut(activeConv)) {
    db.prepare(
      "UPDATE conversations SET handoff_status = 'agent', handoff_admin_id = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(activeConv.id);
  }

  // Get Marvvy response
  try {
    const response = await getMarvvyResponse({
      message: text,
      conversationId: activeConv?.id,
      customerId: customer.id,
      channelType: 'telegram',
    });

    // Send back via Telegram
    const botToken = getTelegramToken();
    if (botToken) {
      await sendTelegramMessage(botToken, chatId, response.text);
    }

    return { ok: true, responded: true, responseId: response.conversationId };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.substring(0, 4096),
      parse_mode: 'HTML',
    }),
  });
}

function getTelegramToken(): string | null {
  const db = getDb();
  const config = db
    .prepare("SELECT config FROM channel_configs WHERE channel_type = 'telegram' AND is_active = 1")
    .get() as any;
  if (!config) return null;
  return JSON.parse(config.config).botToken || null;
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
