import { NextRequest, NextResponse } from 'next/server';
import { ingestDocument, listDocuments, deleteDocument } from '@/lib/rag';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';

export const runtime = 'nodejs';

// GET — list all ingested documents
export async function GET(req: NextRequest) {
  try {
    const docs = listDocuments();
    return NextResponse.json({ documents: docs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — upload and ingest a document
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const category = (formData.get('category') as string) || 'general';
    const tagsStr = (formData.get('tags') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'text/plain', 'text/markdown', 'text/csv',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/html',
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|csv|pdf|docx|doc|html)$/i)) {
      return NextResponse.json({
        error: `File type not supported: ${file.type}. Supported: TXT, MD, CSV, PDF, DOCX, HTML`,
      }, { status: 400 });
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), 'docs-uploads');
    const tempPath = path.join(uploadDir, `${uuid()}-${file.name}`);
    await writeFile(tempPath, buffer);

    try {
      const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
      const result = await ingestDocument({
        filePath: tempPath,
        mimeType: file.type,
        fileName: file.name,
        category,
        tags,
      });

      return NextResponse.json({
        success: true,
        document: {
          id: result.id,
          title: result.title,
          chunks: result.chunks.length,
          category,
          tags,
        },
      });
    } finally {
      // Clean up temp file
      try {
        const { unlink } = await import('fs/promises');
        await unlink(tempPath);
      } catch {}
    }
  } catch (error: any) {
    console.error('Document upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — remove an ingested document
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    deleteDocument(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
