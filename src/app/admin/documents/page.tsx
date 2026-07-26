'use client';

import { useState, useEffect, useRef } from 'react';

interface DocRecord {
  id: string;
  title: string;
  category: string;
  tags: string;
  source_url: string;
  created_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      const docs = (data.documents || [])
        .filter((d: DocRecord) => d.source_url); // Only show docs with a source file
      setDocuments(docs);
    } catch (e) {
      console.error('Failed to load docs:', e);
    }
    setLoading(false);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setStatus(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('tags', tags);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setStatus(`✅ "${data.document.title}" ingested — ${data.document.chunks} chunks created`);
        setTags('');
        loadDocuments();
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (e: any) {
      setStatus(`❌ Upload failed: ${e.message}`);
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
      loadDocuments();
      setStatus('🗑️ Document removed');
    } catch (e) {
      setStatus('❌ Failed to delete');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const categories = ['general', 'sop', 'framework', 'pricing', 'policy', 'onboarding', 'marketing', 'technical'];

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Company Knowledge Base</h2>
          <p className="text-white/40 text-sm mt-1">
            Upload SOPs, service frameworks, pricing packages, and internal docs. Marvvy will reference these when answering questions.
          </p>
        </div>

        {/* Upload area */}
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="font-medium mb-4">📤 Upload Document</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-white/40 block mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50"
              >
                {categories.map(c => (
                  <option key={c} value={c} className="bg-slate-900">{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g. support, tier-1, onboarding"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
              dragOver
                ? 'border-violet-400 bg-violet-500/10'
                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.csv,.pdf,.docx,.doc,.html"
              onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
              className="hidden"
            />
            {uploading ? (
              <div className="space-y-2">
                <div className="typing-indicator inline-flex"><span /><span /><span /></div>
                <p className="text-sm text-white/40">Ingesting document...</p>
              </div>
            ) : (
              <>
                <p className="text-3xl mb-2">📎</p>
                <p className="text-sm font-medium">Drop a file here or click to browse</p>
                <p className="text-xs text-white/30 mt-1">TXT, MD, PDF, DOCX, CSV, HTML — up to 25MB</p>
              </>
            )}
          </div>

          {status && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              status.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-300' :
              status.startsWith('❌') ? 'bg-red-500/10 text-red-300' :
              'bg-white/5 text-white/60'
            }`}>
              {status}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="font-medium mb-3">💡 How To Use</h3>
          <ol className="text-sm text-white/60 space-y-2 list-decimal list-inside">
            <li><strong className="text-white">Upload</strong> your SOPs, service frameworks, and internal docs above</li>
            <li><strong className="text-white">Categorize</strong> each doc (sop, framework, pricing, policy, etc.)</li>
            <li><strong className="text-white">Chat with Marvvy</strong> — she'll automatically search these docs when relevant</li>
            <li><strong className="text-white">Test it</strong>: "What's our onboarding process?" or "What packages do we offer?"</li>
          </ol>
          <div className="mt-4 p-3 bg-violet-500/10 rounded-lg text-sm text-violet-200">
            <strong>Pro tip:</strong> Upload your SOPs with filenames that describe them clearly.
            Good: <code className="text-violet-300">customer-onboarding-sop-v2.pdf</code>
            Bad: <code className="text-violet-300">doc-final-v3.pdf</code>
          </div>
        </div>

        {/* Document list */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-medium">📚 Ingested Documents ({documents.length})</h3>
            <button onClick={loadDocuments} className="text-xs text-white/40 hover:text-white">🔄 Refresh</button>
          </div>

          {loading ? (
            <div className="p-6 text-center text-white/40">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-white/40">No documents yet</p>
              <p className="text-white/20 text-sm mt-1">Upload your first SOP or framework above</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {documents.map(doc => (
                <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/50">{doc.category}</span>
                      {doc.tags && doc.tags.split(',').map((t, i) => (
                        <span key={i} className="text-xs text-white/30">#{t.trim()}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="ml-4 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
