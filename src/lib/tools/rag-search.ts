import { tool } from 'ai';
import { z } from 'zod';
import { searchDocuments } from '@/lib/rag';

/**
 * RAG Search Tool — Searches through all ingested company documents
 * (SOPs, frameworks, service packages, policies, etc.)
 *
 * This is the key tool that makes Marvvy "know" your company.
 * Feed it SOPs, service frameworks, pricing, and internal docs,
 * and Marvvy will reference them in her answers.
 */
export const searchCompanyDocs = tool({
  description:
    'Search through ingested company documents including SOPs, service frameworks, ' +
    'pricing packages, policies, and internal knowledge. Use this whenever a question ' +
    'relates to company-specific processes, offerings, or internal procedures.',
  inputSchema: z.object({
    query: z.string().describe('What to search for in the company documents'),
    maxResults: z.number().optional().default(5),
    category: z.string().optional().describe('Filter by document category'),
  }),
  execute: async ({ query, maxResults, category }) => {
    const results = searchDocuments(query, { maxResults, category });

    if (results.length === 0) {
      return {
        query,
        results: [],
        message: 'No matching documents found. The knowledge base may not yet contain this information. Consider uploading relevant SOPs or documents.',
      };
    }

    return {
      query,
      totalFound: results.length,
      results: results.map(r => ({
        source: r.documentTitle,
        excerpt: r.chunk.substring(0, 600),
        relevance: Math.round(r.score * 100) / 100,
        category: r.metadata.category,
        tags: r.metadata.tags,
      })),
      topMatch: results[0]?.chunk.substring(0, 800) || null,
    };
  },
});
