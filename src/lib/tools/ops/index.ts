import { tool } from 'ai';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db/schema';

// ─── OPERATIONS TOOLS ─────────────────────────────────────────

export const createTask = tool({
  description: 'Create a new task with assignee, priority, and due date.',
  inputSchema: z.object({
    title: z.string(),
    description: z.string().optional(),
    assignedTo: z.string().optional(),
    priority: z.number().min(1).max(5).optional().default(2),
    dueDate: z.string().optional(),
  }),
  execute: async (data) => {
    const db = getDb();
    const id = uuid();
    db.prepare(
      `INSERT INTO tasks (id, title, description, assigned_to, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, data.title, data.description || null, data.assignedTo || null, data.priority, data.dueDate || null);
    return { task: db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) };
  },
});

export const updateTask = tool({
  description: 'Update task status, assignee, or details.',
  inputSchema: z.object({
    id: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
    assignedTo: z.string().optional(),
    priority: z.number().min(1).max(5).optional(),
    title: z.string().optional(),
  }),
  execute: async ({ id, ...data }) => {
    const db = getDb();
    const sets = Object.entries(data)
      .filter(([_, v]) => v !== undefined)
      .map(([k]) => `${k.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`);
    const values = Object.values(data).filter(v => v !== undefined);
    if (sets.length > 0) {
      db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
    }
    return { task: db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) };
  },
});

export const listTasks = tool({
  description: 'List tasks with optional filters.',
  inputSchema: z.object({
    status: z.string().optional(),
    assignedTo: z.string().optional(),
    priority: z.number().optional(),
    limit: z.number().optional().default(20),
  }),
  execute: async (filters) => {
    const db = getDb();
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (filters.status) { conditions.push('status = ?'); values.push(filters.status); }
    if (filters.assignedTo) { conditions.push('assigned_to = ?'); values.push(filters.assignedTo); }
    if (filters.priority) { conditions.push('priority = ?'); values.push(filters.priority); }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM tasks ${where} ORDER BY priority DESC, created_at DESC LIMIT ?`;
    values.push(filters.limit);
    return { tasks: db.prepare(sql).all(...values) };
  },
});

export const createWorkflow = tool({
  description: 'Create a new automated workflow with steps and triggers.',
  inputSchema: z.object({
    name: z.string(),
    triggerType: z.string().describe('e.g. manual, scheduled, event-driven'),
    steps: z.array(z.object({
      name: z.string(),
      action: z.string(),
      config: z.record(z.string(), z.unknown()).optional(),
    })),
  }),
  execute: async ({ name, triggerType, steps }) => {
    const db = getDb();
    const id = uuid();
    const definition = JSON.stringify({ steps, triggerType });
    db.prepare(
      'INSERT INTO workflows (id, name, definition, trigger_type) VALUES (?, ?, ?, ?)'
    ).run(id, name, definition, triggerType);
    return { workflow: db.prepare('SELECT * FROM workflows WHERE id = ?').get(id) };
  },
});

export const triggerWorkflow = tool({
  description: 'Execute a workflow by ID.',
  inputSchema: z.object({
    workflowId: z.string(),
    payload: z.record(z.string(), z.unknown()).optional(),
  }),
  execute: async ({ workflowId, payload }) => {
    const db = getDb();
    const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(workflowId) as any;
    if (!workflow) return { error: 'Workflow not found' };
    // In a full implementation, this would execute the steps
    return {
      executionId: uuid(),
      workflow: workflow.name,
      status: 'triggered',
      payload: payload || {},
      message: `Workflow "${workflow.name}" triggered with ${JSON.parse(workflow.definition).steps.length} steps`,
    };
  },
});

export const createAlert = tool({
  description: 'Create a monitoring alert with conditions and actions.',
  inputSchema: z.object({
    name: z.string(),
    condition: z.string().describe('Alert condition, e.g. "deal_value > 50000"'),
    action: z.string().describe('Action when triggered, e.g. "notify", "create_task"'),
    channel: z.string().optional().default('web'),
  }),
  execute: async ({ name, condition, action, channel }) => {
    const db = getDb();
    const id = uuid();
    db.prepare(
      'INSERT INTO workflows (id, name, definition, trigger_type) VALUES (?, ?, ?, ?)'
    ).run(id, `Alert: ${name}`, JSON.stringify({ condition, action, channel }), 'alert');
    return { alertId: id, name, condition, action, channel, active: true };
  },
});

export const checkCalendar = tool({
  description: 'Check calendar availability for a given period.',
  inputSchema: z.object({
    period: z.string().describe('e.g. "this week", "next 7 days", "July 2026"'),
    durationMinutes: z.number().optional().default(60),
  }),
  execute: async ({ period, durationMinutes }) => {
    // Simulated calendar - in production would connect to Google/Outlook
    const slots = [
      { date: '2026-07-27', time: '09:00', available: true },
      { date: '2026-07-27', time: '10:00', available: true },
      { date: '2026-07-27', time: '14:00', available: true },
      { date: '2026-07-28', time: '11:00', available: true },
      { date: '2026-07-28', time: '15:00', available: true },
    ];
    return { period, durationMinutes, availableSlots: slots };
  },
});

export const scheduleMeeting = tool({
  description: 'Schedule a meeting with participants.',
  inputSchema: z.object({
    title: z.string(),
    dateTime: z.string(),
    participants: z.array(z.string()).optional(),
    durationMinutes: z.number().optional().default(30),
    notes: z.string().optional(),
  }),
  execute: async (data) => {
    const db = getDb();
    const id = uuid();
    db.prepare(
      `INSERT INTO tasks (id, title, description, status, priority, due_date)
       VALUES (?, ?, ?, 'pending', 3, ?)`
    ).run(id, `Meeting: ${data.title}`, JSON.stringify(data), data.dateTime.split('T')[0]);
    return { meetingId: id, ...data, status: 'scheduled' };
  },
});

export const generateReport = tool({
  description: 'Generate an operational report.',
  inputSchema: z.object({
    type: z.enum(['pipeline', 'tasks', 'activity', 'performance']),
    period: z.string().optional().default('this month'),
  }),
  execute: async ({ type, period }) => {
    const db = getDb();
    let data: any = {};
    switch (type) {
      case 'pipeline': {
        const deals = db.prepare('SELECT stage, COUNT(*) as count, SUM(value) as value FROM deals GROUP BY stage').all();
        data = { deals, period };
        break;
      }
      case 'tasks': {
        const tasks = db.prepare("SELECT status, COUNT(*) as count FROM tasks GROUP BY status").all();
        data = { tasks, period };
        break;
      }
      case 'activity': {
        const msgs = db.prepare("SELECT channel_type, COUNT(*) as count FROM messages GROUP BY channel_type").all();
        data = { messagesByChannel: msgs, period };
        break;
      }
      default:
        data = { message: `Report type "${type}" for ${period}`, period };
    }
    return { reportId: uuid(), type, period, data };
  },
});

export const searchIntegrations = tool({
  description: 'Search connected external tools and integrations.',
  inputSchema: z.object({
    query: z.string().optional(),
  }),
  execute: async ({ query }) => {
    // Simulated integrations
    const integrations = [
      { name: 'Slack', status: 'connected', type: 'messaging' },
      { name: 'Jira', status: 'connected', type: 'project_management' },
      { name: 'Google Calendar', status: 'connected', type: 'calendar' },
      { name: 'Salesforce', status: 'disconnected', type: 'crm' },
    ];
    if (query) {
      return { integrations: integrations.filter(i => i.name.toLowerCase().includes(query.toLowerCase())) };
    }
    return { integrations };
  },
});
