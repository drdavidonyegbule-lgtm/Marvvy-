/**
 * RAG Engine — Document ingestion, chunking, embedding, and semantic search.
 * Powers Marvvy's company knowledge: SOPs, frameworks, packages, and docs.
 *
 * Local dev: SQLite + simple TF-IDF embeddings
 * Production: Vercel Postgres + pgvector or Pinecone for real embeddings
 */

import { getDb } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';
import * as mammoth from 'mammoth';
import path from 'path';
import fs from 'fs';

// ─── TYPES ─────────────────────────────────────────────────────

export interface ChunkedDocument {
  id: string;
  title: string;
  content: string;
  chunks: DocumentChunk[];
}

export interface DocumentChunk {
  chunkIndex: number;
  content: string;
  embedding?: number[];
  metadata: Record<string, string>;
}

export interface SearchResult {
  chunk: string;
  documentTitle: string;
  documentId: string;
  score: number;
  metadata: Record<string, string>;
}

// ─── TEXT EXTRACTION ───────────────────────────────────────────

export async function extractText(filePath: string, mimeType: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.txt':
    case '.md':
    case '.csv':
      return fs.readFileSync(filePath, 'utf-8');

    case '.docx':
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
      } catch (e) {
        throw new Error(`Failed to parse DOCX: ${e}`);
      }

    case '.pdf':
      try {
        const { PDFParse } = await import('pdf-parse');
        const buffer = fs.readFileSync(filePath);
        const pdf = new PDFParse(buffer);
        const result = await pdf.getText();
        return (result as any).text as string;
      } catch (e: any) {
        throw new Error(`Failed to parse PDF: ${e}`);
      }

    case '.html':
    case '.htm':
      const html = fs.readFileSync(filePath, 'utf-8');
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    default:
      // Try as plain text
      return fs.readFileSync(filePath, 'utf-8');
  }
}

// ─── CHUNKING ───────────────────────────────────────────────────

export function chunkDocument(
  text: string,
  options: {
    chunkSize?: number;
    chunkOverlap?: number;
    metadata?: Record<string, string>;
  } = {}
): DocumentChunk[] {
  const { chunkSize = 800, chunkOverlap = 150, metadata = {} } = options;

  // Split into paragraphs first
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 20);

  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;
  let currentChunk = '';
  let currentParagraphs: string[] = [];

  for (const paragraph of paragraphs) {
    // If adding this paragraph exceeds chunk size, save current chunk
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        chunkIndex,
        content: currentChunk.trim(),
        metadata: { ...metadata },
      });
      chunkIndex++;

      // Start new chunk with overlap from previous
      const overlapText = currentParagraphs.slice(-2).join('\n\n');
      currentChunk = overlapText ? overlapText + '\n\n' + paragraph : paragraph;
      currentParagraphs = overlapText ? currentParagraphs.slice(-2).concat(paragraph) : [paragraph];
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentParagraphs.push(paragraph);
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      chunkIndex,
      content: currentChunk.trim(),
      metadata: { ...metadata },
    });
  }

  return chunks;
}

// ─── EMBEDDING (Simple TF-IDF for local dev) ──────────────────

/**
 * Simple keyword-based search for local dev (no external embedding API needed).
 * For production, replace with OpenAI text-embedding-3-large or similar.
 */
export function computeTFIDF(query: string, documents: string[]): number[] {
  const queryTerms = tokenize(query);
  const docTokensList = documents.map(tokenize);

  // Compute IDF for query terms
  const N = documents.length;
  const scores: number[] = [];

  for (let i = 0; i < documents.length; i++) {
    const docTokens = docTokensList[i];
    let score = 0;

    for (const term of queryTerms) {
      const tf = docTokens.filter(t => t === term).length / (docTokens.length || 1);
      const df = docTokensList.filter(dt => dt.includes(term)).length;
      const idf = Math.log((N + 1) / (df + 1)) + 1;
      score += tf * idf;
    }

    // Boost exact phrase matches
    if (documents[i].toLowerCase().includes(query.toLowerCase())) {
      score *= 1.5;
    }

    scores.push(score);
  }

  return scores;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

// ─── INGESTION ─────────────────────────────────────────────────

export async function ingestDocument(params: {
  filePath: string;
  mimeType: string;
  fileName: string;
  category?: string;
  tags?: string[];
}): Promise<ChunkedDocument> {
  const db = getDb();
  const { filePath, mimeType, fileName, category = 'general', tags = [] } = params;

  // Extract text
  const text = await extractText(filePath, mimeType);

  // Create document title from filename
  const title = path.basename(fileName, path.extname(fileName))
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  // Chunk
  const chunks = chunkDocument(text, {
    metadata: {
      source: fileName,
      category,
      tags: tags.join(','),
      ingestedAt: new Date().toISOString(),
    },
  });

  // Store document record
  const docId = uuid();
  db.prepare(
    `INSERT INTO knowledge_articles (id, title, content, category, tags, source_url, confidence)
     VALUES (?, ?, ?, ?, ?, ?, 1.0)`
  ).run(docId, title, text, category, tags.join(','), fileName);

  // Store chunks for granular search
  for (const chunk of chunks) {
    const chunkId = uuid();
    db.prepare(
      `INSERT INTO doc_chunks (id, document_id, chunk_index, content, metadata)
       VALUES (?, ?, ?, ?, ?)`
    ).run(chunkId, docId, chunk.chunkIndex, chunk.content, JSON.stringify(chunk.metadata));

    // Also insert as knowledge article for backward compat with existing search
    db.prepare(
      `INSERT INTO knowledge_articles (id, title, content, category, tags, confidence)
       VALUES (?, ?, ?, ?, ?, 0.95)`
    ).run(uuid(), `${title} [chunk ${chunk.chunkIndex + 1}]`, chunk.content, category, tags.join(','));
  }

  return {
    id: docId,
    title,
    content: text,
    chunks,
  };
}

// ─── SEMANTIC SEARCH ───────────────────────────────────────────

export function searchDocuments(query: string, options?: {
  maxResults?: number;
  category?: string;
  tags?: string[];
}): SearchResult[] {
  const db = getDb();
  const maxResults = options?.maxResults || 5;
  const opts = options || {};

  // Get all chunks
  let allChunks = db.prepare('SELECT * FROM doc_chunks').all() as any[];

  // Filter by category if specified
  if (opts.category) {
    allChunks = allChunks.filter((chunk: any) => {
      const ka = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(chunk.document_id) as any;
      return ka?.category === opts.category;
    });
  }

  if (allChunks.length === 0) {
    // Fallback: search knowledge_articles directly
    const allArticles = db.prepare('SELECT * FROM knowledge_articles').all() as any[];
    const matching = allArticles.filter((a: any) => {
      const q = query.toLowerCase();
      return (a.title || '').toLowerCase().includes(q) ||
             (a.content || '').toLowerCase().includes(q) ||
             (a.tags || '').toLowerCase().includes(q);
    }).slice(0, maxResults);

    return matching.map((a: any) => ({
      chunk: (a.content || '').substring(0, 500),
      documentTitle: a.title,
      documentId: a.id,
      score: 0.7,
      metadata: { category: a.category, tags: a.tags },
    }));
  }

  // TF-IDF scoring
  const chunkContents = allChunks.map((c: any) => c.content || '');
  const scores = computeTFIDF(query, chunkContents);

  return allChunks
    .map((chunk: any, i: number) => ({
      chunk: chunk.content,
      documentTitle: chunk.metadata ? JSON.parse(chunk.metadata).source : 'Unknown',
      documentId: chunk.document_id,
      score: scores[i],
      metadata: chunk.metadata ? JSON.parse(chunk.metadata) : {},
    }))
    .filter((s: SearchResult) => s.score > 0)
    .sort((a: SearchResult, b: SearchResult) => b.score - a.score)
    .slice(0, maxResults);
}

// ─── GET ALL DOCUMENTS ─────────────────────────────────────────

export function listDocuments(options?: {
  category?: string;
  limit?: number;
}) {
  const db = getDb();
  const opts = options || {};
  const allArticles = db.prepare('SELECT * FROM knowledge_articles').all() as any[];

  // Filter in JS: only docs with a source file, optionally by category
  let filtered = allArticles.filter((a: any) => a.source_url && a.source_url !== 'null');
  if (opts.category) {
    filtered = filtered.filter((a: any) => a.category === opts.category);
  }
  // Sort by created_at desc
  filtered.sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return filtered.slice(0, opts.limit || 50);
}

export function deleteDocument(id: string) {
  const db = getDb();
  db.prepare('DELETE FROM doc_chunks WHERE document_id = ?').run(id);
  db.prepare('DELETE FROM knowledge_articles WHERE id = ?').run(id);
}
