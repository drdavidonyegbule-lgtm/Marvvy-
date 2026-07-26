import { getDb } from '@/lib/db/schema';

/**
 * Memory Manager for Marvvy
 *
 * Layer 1: Working Memory — active conversation context (handled by AI SDK message history)
 * Layer 2: Short-Term Memory — recent interactions from DB (30 days)
 * Layer 3: Long-Term Memory — important events stored as agent_memories
 * Layer 4: Episodic Memory — key events and decisions
 */

export interface MemoryContext {
  recentConversations: string[];
  keyMemories: string[];
  preferences: Record<string, string>;
}

export function getMemoryContext(customerId: string): string {
  const db = getDb();

  // Get recent conversations
  const recentConvs = db
    .prepare(
      `SELECT c.id, c.subject, c.status, COUNT(m.id) as message_count
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.customer_id = ?
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT 5`
    )
    .all(customerId) as any[];

  // Get key episodic memories
  const memories = db
    .prepare(
      `SELECT event_type, summary, importance, created_at
       FROM agent_memories
       WHERE customer_id = ?
       ORDER BY importance DESC, created_at DESC
       LIMIT 10`
    )
    .all(customerId) as any[];

  // Get recent messages for context
  const recentMessages = db
    .prepare(
      `SELECT m.content, m.direction, m.created_at
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE c.customer_id = ?
       ORDER BY m.created_at DESC
       LIMIT 10`
    )
    .all(customerId) as any[];

  // Get customer profile
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

  if (memories.length > 0) {
    context += `\n## Key Memories (Episodic)\n`;
    memories.forEach((m: any) => {
      context += `- [${m.event_type}] ${m.summary} (importance: ${m.importance})\n`;
    });
  }

  if (recentConvs.length > 0) {
    context += `\n## Recent Conversations\n`;
    recentConvs.forEach((c: any) => {
      context += `- "${c.subject}" (${c.status}, ${c.message_count} messages)\n`;
    });
  }

  if (recentMessages.length > 0) {
    context += `\n## Recent Messages (most recent first)\n`;
    recentMessages.reverse().forEach((m: any) => {
      const prefix = m.direction === 'inbound' ? 'User' : 'Marvvy';
      context += `- [${prefix}]: ${m.content?.substring(0, 200)}\n`;
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

export function forgetOldMemories(daysThreshold: number = 90) {
  const db = getDb();
  db.prepare(
    `DELETE FROM agent_memories WHERE importance < 0.3 AND created_at < datetime('now', ?))`
  ).run(`-${daysThreshold} days`);
}
