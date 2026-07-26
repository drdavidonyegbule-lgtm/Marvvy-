import { streamText, generateText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db/schema';
import { getMemoryContext } from '@/lib/memory';
import { classifyIntent, analyzeSentiment, escalateToHuman } from '@/lib/tools/utility';
import { crmAgentTools } from './crm';
import { opsAgentTools } from './ops';
import { consultingAgentTools } from './consulting';
import { searchCompanyDocs } from '@/lib/tools/rag-search';

// ─── ALL TOOLS ─────────────────────────────────────────────────

const allTools = {
  // Utility
  classifyIntent,
  analyzeSentiment,
  escalateToHuman,
  // RAG — Company Knowledge
  search_company_docs: searchCompanyDocs,
  // CRM
  ...crmAgentTools,
  // Operations
  ...opsAgentTools,
  // Consulting
  ...consultingAgentTools,
};

// ─── MARVVY SYSTEM PROMPT ─────────────────────────────────────

const MARVVY_SYSTEM_PROMPT = `You are Marvvy, a veteran operational, CRM, and consultant AI agent. You operate across all channels (web, email, SMS, voice, social media) with a single unified brain.

## Your Identity
- **Name**: Marvvy
- **Expertise**: 15+ years equivalent experience in CRM, business operations, and management consulting
- **Personality**: Professional, warm, proactive, and data-driven
- **Tone**: Confident but approachable. Adapt formality to the channel.

## Your Capabilities
You have access to 40+ tools across four domains:

### Company Knowledge (RAG)
- **IMPORTANT**: You have a "search_company_docs" tool for searching the company's internal knowledge base.
- This contains the company's SOPs, service frameworks, pricing packages, policies, and other internal documents.
- **Always search company docs first** when a question relates to company processes, services, offerings, or internal procedures — before giving a generic answer.
- When you find relevant docs, cite them in your response (e.g., "According to our SOP on...").

### CRM
- Search, create, update contacts
- Manage leads (create, qualify, score)
- Track deals and pipeline
- Get 360° customer views
- Schedule smart follow-ups

### Operations
- Create and manage tasks
- Build and trigger workflows
- Set up monitoring alerts
- Manage calendar and meetings
- Generate reports
- Connect to external integrations

### Consulting
- Research business topics
- Analyze data (trends, comparisons, correlations)
- Generate strategic plans
- Perform SWOT and competitive analysis
- Build financial models
- Search knowledge base
- Generate actionable recommendations

### Utility
- Classify user intent
- Detect language and translate
- Summarize content
- Extract entities
- Analyze sentiment
- Search the web
- Calculate values
- Escalate to human when needed

## How You Operate
1. **Understand First**: Always classify the user's intent before acting
2. **Use Your Tools**: Don't just talk — use your tools to get real data and take real actions
3. **Be Proactive**: Anticipate needs. If someone asks about a deal, also check related tasks.
4. **Cross-Channel Context**: Remember that the same customer may reach you on different channels
5. **Reflect Before Responding**: Double-check your output for accuracy and completeness
6. **Escalate When Needed**: If something is beyond your capability or requires human judgment, escalate

## Response Style
- Use emojis and formatting sparingly but effectively
- Structure responses with clear sections when providing multiple pieces of information
- Be concise on SMS/mobile, detailed on email/web
- Always confirm actions taken and provide next steps
- If you're unsure about something, ask clarifying questions before proceeding

## Current Context
You are serving a user in Ebute Ikorodu, Lagos, Nigeria. Timezone: Africa/Lagos. Today's date: July 26, 2026.
`;

// ─── ORCHESTRATOR ─────────────────────────────────────────────

export async function processMessage(params: {
  message: string;
  conversationId?: string;
  customerId?: string;
  channelType?: string;
}) {
  const { message, conversationId: existingConvId, customerId, channelType = 'web' } = params;
  const db = getDb();

  // Get or create conversation
  let conversationId = existingConvId;
  if (!conversationId) {
    conversationId = uuid();
    const custId = customerId || uuid();
    if (!customerId) {
      // Guest user — create a temporary profile
      db.prepare(
        'INSERT OR IGNORE INTO customers (id, name, channel_origin) VALUES (?, ?, ?)'
      ).run(custId, 'Guest User', channelType);
    }
    db.prepare(
      `INSERT INTO conversations (id, customer_id, channel_origin, subject)
       VALUES (?, ?, ?, ?)`
    ).run(conversationId, custId, channelType, message.substring(0, 100));
  }

  // Store inbound message
  const messageId = uuid();
  db.prepare(
    `INSERT INTO messages (id, conversation_id, channel_type, direction, content)
     VALUES (?, ?, ?, 'inbound', ?)`
  ).run(messageId, conversationId, channelType, message);

  // Get memory context
  const conv = db.prepare('SELECT customer_id FROM conversations WHERE id = ?').get(conversationId) as any;
  const memoryContext = conv?.customer_id
    ? getMemoryContext(conv.customer_id)
    : '';

  // Build system prompt with memory
  const systemWithMemory = MARVVY_SYSTEM_PROMPT + '\n\n' + memoryContext;

  return {
    conversationId,
    systemPrompt: systemWithMemory,
    messageId,
    db,
  };
}

// ─── STREAMING RESPONSE ───────────────────────────────────────

export async function streamMarvvyResponse(params: {
  message: string;
  conversationId?: string;
  customerId?: string;
  channelType?: string;
}) {
  const { conversationId, systemPrompt, messageId, db } = await processMessage(params);

  const stream = streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages: [{ role: 'user', content: params.message }],
    tools: allTools,
    stopWhen: stepCountIs(8),
    onFinish: async ({ text, usage }) => {
      // Store outbound message
      db.prepare(
        `INSERT INTO messages (id, conversation_id, channel_type, direction, content, reflection_score)
         VALUES (?, ?, ?, 'outbound', ?, ?)`
      ).run(uuid(), conversationId, params.channelType || 'web', text, null);
    },
  });

  return stream;
}

// ─── NON-STREAMING RESPONSE ───────────────────────────────────

export async function getMarvvyResponse(params: {
  message: string;
  conversationId?: string;
  customerId?: string;
  channelType?: string;
}) {
  const { conversationId, systemPrompt, messageId, db } = await processMessage(params);

  const result = await generateText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages: [{ role: 'user', content: params.message }],
    tools: allTools,
    stopWhen: stepCountIs(8),
  });

  // Store outbound message
  db.prepare(
    `INSERT INTO messages (id, conversation_id, channel_type, direction, content, tool_calls)
     VALUES (?, ?, ?, 'outbound', ?, ?)`
  ).run(
    uuid(),
    conversationId,
    params.channelType || 'web',
    result.text,
    JSON.stringify(result.toolCalls || [])
  );

  return {
    text: result.text,
    conversationId,
    toolCalls: result.toolCalls || [],
    usage: result.usage,
  };
}
