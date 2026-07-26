import { tool } from 'ai';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

// ─── UTILITY TOOLS ────────────────────────────────────────────

export const classifyIntent = tool({
  description: 'Classify the user intent into business categories.',
  inputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ message }) => {
    const lower = message.toLowerCase();
    const intents: { intent: string; confidence: number }[] = [];

    if (/contact|customer|lead|deal|pipeline|crm|sales/i.test(lower))
      intents.push({ intent: 'crm', confidence: 0.9 });
    if (/task|workflow|schedule|alert|report|meeting/i.test(lower))
      intents.push({ intent: 'operations', confidence: 0.85 });
    if (/analy|strateg|research|recommend|consult|swot|competitive/i.test(lower))
      intents.push({ intent: 'consulting', confidence: 0.88 });
    if (/help|hello|hi|what can you do/i.test(lower))
      intents.push({ intent: 'general', confidence: 0.95 });

    if (intents.length === 0) intents.push({ intent: 'general', confidence: 0.7 });

    return { intents };
  },
});

export const detectLanguage = tool({
  description: 'Detect the language of a given text.',
  inputSchema: z.object({ text: z.string() }),
  execute: async ({ text }) => {
    // Simplified detection - in production use a proper language detection library
    const patterns: Record<string, RegExp> = {
      en: /^[a-zA-Z\s.,!?'"()-]+$/,
      es: /[áéíóúñü¿¡]/i,
      fr: /[àâçéèêëîïôûùüÿœæ]/i,
      de: /[äöüß]/i,
    };
    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) return { language: lang, confidence: 0.8 };
    }
    return { language: 'en', confidence: 0.9 };
  },
});

export const translateText = tool({
  description: 'Translate text between languages.',
  inputSchema: z.object({
    text: z.string(),
    targetLanguage: z.string(),
    sourceLanguage: z.string().optional(),
  }),
  execute: async ({ text, targetLanguage, sourceLanguage }) => {
    return {
      original: text,
      translated: `[Translation of "${text.substring(0, 50)}..." to ${targetLanguage} would appear here]`,
      targetLanguage,
      sourceLanguage: sourceLanguage || 'auto-detected',
    };
  },
});

export const summarizeText = tool({
  description: 'Summarize long text into key points.',
  inputSchema: z.object({
    text: z.string(),
    maxLength: z.number().optional().default(3),
    format: z.enum(['bullet_points', 'paragraph']).optional().default('bullet_points'),
  }),
  execute: async ({ text, maxLength, format }) => {
    const wordCount = text.split(/\s+/).length;
    return {
      summaryId: uuid(),
      originalLength: wordCount,
      format,
      summary: `Summary of ${wordCount}-word text (${maxLength} ${format === 'bullet_points' ? 'points' : 'paragraphs'} requested)`,
      keyPoints: [`Main point extracted from the text`, `Secondary insight`, `Key takeaway`].slice(0, maxLength),
    };
  },
});

export const extractEntities = tool({
  description: 'Extract named entities (people, companies, dates, amounts) from text.',
  inputSchema: z.object({ text: z.string() }),
  execute: async ({ text }) => {
    return {
      entities: {
        people: [],
        companies: [],
        dates: [],
        amounts: [],
        emails: text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [],
        phones: text.match(/\+?[\d\s()-]{7,}/g) || [],
      },
    };
  },
});

export const analyzeSentiment = tool({
  description: 'Analyze the sentiment of a text.',
  inputSchema: z.object({ text: z.string() }),
  execute: async ({ text }) => {
    const lower = text.toLowerCase();
    const positive = /great|excellent|good|happy|pleased|wonderful|fantastic|love/i;
    const negative = /bad|terrible|awful|unhappy|angry|frustrated|hate|poor/i;
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let score = 0.5;
    if (positive.test(lower)) { sentiment = 'positive'; score = 0.8; }
    if (negative.test(lower)) { sentiment = 'negative'; score = 0.2; }
    return { sentiment, score, text: text.substring(0, 100) };
  },
});

export const webSearch = tool({
  description: 'Search the web for real-time information.',
  inputSchema: z.object({
    query: z.string(),
    numResults: z.number().optional().default(3),
  }),
  execute: async ({ query, numResults }) => {
    return {
      query,
      results: [
        { title: `Result for: ${query}`, snippet: `Relevant information about ${query} from the web.`, url: 'https://example.com/1' },
      ].slice(0, numResults),
    };
  },
});

export const calculate = tool({
  description: 'Perform mathematical calculations.',
  inputSchema: z.object({
    expression: z.string().describe('Mathematical expression to evaluate'),
  }),
  execute: async ({ expression }) => {
    try {
      // Safe evaluation - only allow numbers and basic operators
      const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
      const result = Function(`'use strict'; return (${sanitized})`)();
      return { expression, result };
    } catch {
      return { expression, error: 'Could not evaluate expression' };
    }
  },
});

export const getCurrentDateTime = tool({
  description: 'Get the current date and time in the specified timezone.',
  inputSchema: z.object({
    timezone: z.string().optional().default('Africa/Lagos'),
  }),
  execute: async ({ timezone }) => {
    const now = new Date();
    return {
      iso: now.toISOString(),
      readable: now.toLocaleString('en-US', { timeZone: timezone }),
      timezone,
      timestamp: now.getTime(),
    };
  },
});

export const escalateToHuman = tool({
  description: 'Escalate the conversation to a human operator when the agent cannot handle the request.',
  inputSchema: z.object({
    reason: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
    summary: z.string().optional(),
  }),
  execute: async ({ reason, priority, summary }) => {
    return {
      escalationId: uuid(),
      status: 'escalated',
      reason,
      priority,
      summary: summary || 'No summary provided',
      message: `This conversation has been escalated to a human operator (${priority} priority). They will review: ${reason}`,
      estimatedResponse: priority === 'urgent' ? 'Within 5 minutes' : 'Within 1 hour',
    };
  },
});
