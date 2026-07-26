import { getDb } from '@/lib/db/schema';

/**
 * Memory Manager for Marvvy (4-layer memory system).
 * Uses simple queries compatible with the JSON file store.
 */

export function getMemoryContext(customerId: string): string {
  const db = getDb();

  // Recent messages across all this customer's conversations
  const allMessages = db
    .prepare('SELECT * FROM messages ORDER BY created_at DESC')
    .all();

  const recentMessages = (allMessages as any[])
    .filter((m: any) => {
      const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(m.conversation_id) as any;
      return conv?.customer_id === customerId;
    })
    .slice(0, 15);

  // Key episodic memories
  const memories = db
    .prepare('SELECT * FROM agent_memories WHERE customer_id = ? ORDER BY importance DESC')
    .all(customerId) as any[];

  const recentMemories = (memories || [])
    .sort((a: any, b: any) => (b.importance || 0) - (a.importance || 0))
    .slice(0, 10);

  // Recent conversations
  const allConvs = db
    .prepare('SELECT * FROM conversations WHERE customer_id = ?')
    .all(customerId) as any[];

  const recentConvs = (allConvs || [])
    .sort((a: any, b: any) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
    .slice(0, 5);

  // Customer profile
  const customer = db
    .prepare('SELECT * FROM customers WHERE id = ?')
    .get(customerId) as any;

  let context = '';

  if (customer) {
    context += `\n## Customer Profile\n`;
    context += `Name: ${customer.name}\n`;
    if (customer.email) context += `Email: ${customer.email}\n`;
    if (customer.phone) context += `Phone: ${customer.phone}\n`;
    if (customer.company) context += `Company: ${customer.company}\n`;
    if (customer.role) context += `Role: ${customer.role}\n`;
    if (customer.tags) context += `Tags: ${customer.tags}\n`;
  }

  if (recentMemories.length > 0) {
    context += `\n## Key Memories\n`;
    recentMemories.forEach((m: any) => {
      context += `- [${m.event_type}] ${m.summary}\n`;
    });
  }

  if (recentConvs.length > 0) {
    context += `\n## Recent Conversations\n`;
    recentConvs.forEach((c: any) => {
      context += `- "${c.subject}" (status: ${c.status})\n`;
    });
  }

  if (recentMessages.length > 0) {
    context += `\n## Recent Messages\n`;
    recentMessages.reverse().slice(-8).forEach((m: any) => {
      const prefix = m.direction === 'inbound' ? 'Client' : 'Marvvy';
      context += `- [${prefix}]: ${String(m.content || '').substring(0, 200)}\n`;
    });
  }

  return context.trim()
    ? `## Cross-Channel Memory Context\n${context}`
    : '';
}

export function storeMemory(params: {
  customerId: string;
  eventType: string;
  summary: string;
  importance?: number;
}) {
  const db = getDb();
  const { v4: uuid } = require('uuid');
  db.prepare(
    `INSERT INTO agent_memories (id, customer_id, event_type, summary, importance)
     VALUES (?, ?, ?, ?, ?)`
  ).run(uuid(), params.customerId, params.eventType, params.summary, params.importance || 0.5);
}
