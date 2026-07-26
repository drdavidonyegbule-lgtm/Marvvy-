import { tool } from 'ai';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db/schema';

// ─── CRM TOOLS ───────────────────────────────────────────────

export const searchContacts = tool({
  description: 'Search contacts by name, email, company, or tags. Returns matching contacts.',
  inputSchema: z.object({
    query: z.string().describe('Search query for name, email, or company'),
    limit: z.number().optional().default(10),
  }),
  execute: async ({ query, limit }) => {
    const db = getDb();
    const results = db
      .prepare(
        `SELECT * FROM customers 
         WHERE name LIKE ? OR email LIKE ? OR company LIKE ? OR tags LIKE ?
         LIMIT ?`
      )
      .all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit);
    return { contacts: results, count: results.length };
  },
});

export const createContact = tool({
  description: 'Create a new contact in the CRM.',
  inputSchema: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    role: z.string().optional(),
    tags: z.string().optional(),
    channelOrigin: z.string().optional().default('web'),
  }),
  execute: async (data) => {
    const db = getDb();
    const id = uuid();
    db.prepare(
      `INSERT INTO customers (id, name, email, phone, company, role, tags, channel_origin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, data.name, data.email || null, data.phone || null, data.company || null, data.role || null, data.tags || null, data.channelOrigin);
    return { contact: db.prepare('SELECT * FROM customers WHERE id = ?').get(id) };
  },
});

export const updateContact = tool({
  description: 'Update an existing contact.',
  inputSchema: z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    role: z.string().optional(),
    tags: z.string().optional(),
  }),
  execute: async ({ id, ...data }) => {
    const db = getDb();
    const sets = Object.entries(data)
      .filter(([_, v]) => v !== undefined)
      .map(([k]) => `${k} = ?`);
    const values = Object.values(data).filter(v => v !== undefined);
    if (sets.length > 0) {
      db.prepare(
        `UPDATE customers SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`
      ).run(...values, id);
    }
    return { contact: db.prepare('SELECT * FROM customers WHERE id = ?').get(id) };
  },
});

export const getContact360 = tool({
  description: 'Get a 360-degree view of a customer including all interactions, deals, and tasks.',
  inputSchema: z.object({ id: z.string() }),
  execute: async ({ id }) => {
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    const conversations = db.prepare('SELECT * FROM conversations WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20').all(id);
    const leads = db.prepare('SELECT * FROM leads WHERE customer_id = ?').all(id);
    const deals = db.prepare('SELECT * FROM deals WHERE customer_id = ?').all(id);
    const memories = db.prepare('SELECT * FROM agent_memories WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10').all(id);
    return { customer, conversations, leads, deals, memories };
  },
});

export const createLead = tool({
  description: 'Create a new lead in the CRM pipeline.',
  inputSchema: z.object({
    customerId: z.string().optional(),
    name: z.string(),
    email: z.string().email().optional(),
    company: z.string().optional(),
    source: z.string().optional().default('direct'),
    expectedValue: z.number().optional().default(0),
  }),
  execute: async (data) => {
    const db = getDb();
    const leadId = uuid();
    let customerId = data.customerId;
    if (!customerId) {
      customerId = uuid();
      db.prepare('INSERT INTO customers (id, name, email, company) VALUES (?, ?, ?, ?)').run(
        customerId, data.name, data.email || null, data.company || null
      );
    }
    db.prepare(
      `INSERT INTO leads (id, customer_id, source, expected_value) VALUES (?, ?, ?, ?)`
    ).run(leadId, customerId, data.source, data.expectedValue);
    return { lead: db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId), customerId };
  },
});

export const qualifyLead = tool({
  description: 'Score and qualify a lead based on engagement, fit, and intent signals.',
  inputSchema: z.object({
    leadId: z.string(),
    score: z.number().min(0).max(100).optional(),
    status: z.enum(['new', 'qualified', 'contacted', 'converted', 'lost']).optional(),
    notes: z.string().optional(),
  }),
  execute: async ({ leadId, score, status, notes }) => {
    const db = getDb();
    const updates: string[] = [];
    const values: unknown[] = [];
    if (score !== undefined) { updates.push('score = ?'); values.push(score); }
    if (status) { updates.push('status = ?'); values.push(status); }
    if (updates.length > 0) {
      db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...values, leadId);
    }
    if (notes) {
      const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
      db.prepare('INSERT INTO agent_memories (id, customer_id, event_type, summary) VALUES (?, ?, ?, ?)')
        .run(uuid(), lead?.customer_id || null, 'lead_qualification', notes);
    }
    return { lead: db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) };
  },
});

export const listLeads = tool({
  description: 'List leads with optional status filter.',
  inputSchema: z.object({
    status: z.string().optional(),
    limit: z.number().optional().default(20),
  }),
  execute: async ({ status, limit }) => {
    const db = getDb();
    const sql = status
      ? 'SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC LIMIT ?'
      : 'SELECT * FROM leads ORDER BY created_at DESC LIMIT ?';
    const params = status ? [status, limit] : [limit];
    return { leads: db.prepare(sql).all(...params) };
  },
});

export const createDeal = tool({
  description: 'Create a new deal/opportunity in the pipeline.',
  inputSchema: z.object({
    leadId: z.string().optional(),
    customerId: z.string().optional(),
    name: z.string(),
    value: z.number().optional().default(0),
    stage: z.string().optional().default('discovery'),
    probability: z.number().min(0).max(100).optional().default(10),
    closeDate: z.string().optional(),
  }),
  execute: async (data) => {
    const db = getDb();
    const dealId = uuid();
    let customerId = data.customerId;
    if (!customerId && data.leadId) {
      const lead = db.prepare('SELECT customer_id FROM leads WHERE id = ?').get(data.leadId) as any;
      if (lead) customerId = lead.customer_id;
    }
    db.prepare(
      `INSERT INTO deals (id, lead_id, customer_id, name, stage, value, probability, close_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(dealId, data.leadId || null, customerId || null, data.name, data.stage, data.value, data.probability, data.closeDate || null);
    return { deal: db.prepare('SELECT * FROM deals WHERE id = ?').get(dealId) };
  },
});

export const moveDealStage = tool({
  description: 'Move a deal to a new pipeline stage.',
  inputSchema: z.object({
    dealId: z.string(),
    newStage: z.string(),
    probability: z.number().min(0).max(100).optional(),
  }),
  execute: async ({ dealId, newStage, probability }) => {
    const db = getDb();
    if (probability !== undefined) {
      db.prepare('UPDATE deals SET stage = ?, probability = ? WHERE id = ?').run(newStage, probability, dealId);
    } else {
      db.prepare('UPDATE deals SET stage = ? WHERE id = ?').run(newStage, dealId);
    }
    return { deal: db.prepare('SELECT * FROM deals WHERE id = ?').get(dealId) };
  },
});

export const getPipeline = tool({
  description: 'Get the full sales pipeline overview with deal counts and values by stage.',
  inputSchema: z.object({}),
  execute: async () => {
    const db = getDb();
    const allDeals = db.prepare('SELECT * FROM deals').all() as any[];

    // Aggregate by stage in JS
    const stageMap: Record<string, { count: number; total_value: number; probabilities: number[] }> = {};
    for (const deal of allDeals) {
      const s = deal.stage || 'unknown';
      if (!stageMap[s]) stageMap[s] = { count: 0, total_value: 0, probabilities: [] };
      stageMap[s].count++;
      stageMap[s].total_value += Number(deal.value) || 0;
      stageMap[s].probabilities.push(Number(deal.probability) || 0);
    }

    const stages = Object.entries(stageMap)
      .map(([stage, data]) => ({
        stage,
        count: data.count,
        total_value: data.total_value,
        avg_probability: data.probabilities.length > 0
          ? Math.round(data.probabilities.reduce((a, b) => a + b, 0) / data.probabilities.length)
          : 0,
      }))
      .sort((a, b) => b.total_value - a.total_value);

    const totalValue = stages.reduce((sum, s) => sum + s.total_value, 0);
    const totalDeals = stages.reduce((sum, s) => sum + s.count, 0);
    return { stages, totalValue, totalDeals };
  },
});

export const scheduleFollowup = tool({
  description: 'Schedule a follow-up for a contact or deal. Smart scheduling based on context.',
  inputSchema: z.object({
    contactId: z.string(),
    trigger: z.string().describe('When to follow up, e.g. "48h", "next Monday", "after deal closes"'),
    reason: z.string().optional(),
  }),
  execute: async ({ contactId, trigger, reason }) => {
    const db = getDb();
    const taskId = uuid();
    const contact = db.prepare('SELECT name FROM customers WHERE id = ?').get(contactId) as any;
    const title = `Follow up with ${contact?.name || 'contact'}: ${reason || 'Check-in'}`;
    const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 10);
    db.prepare(
      `INSERT INTO tasks (id, title, description, status, priority, due_date)
       VALUES (?, ?, ?, 'pending', 3, ?)`
    ).run(taskId, title, `Trigger: ${trigger}. ${reason || ''}`, dueDate);
    db.prepare(
      'INSERT INTO agent_memories (id, customer_id, event_type, summary) VALUES (?, ?, ?, ?)'
    ).run(uuid(), contactId, 'followup_scheduled', `Followup: ${trigger} - ${reason || 'check-in'}`);
    return { taskId, title, trigger };
  },
});
