'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [pipeline, tasks] = await Promise.all([
        fetch('/api/crm/pipeline').then(r => r.json()),
        fetch('/api/ops/tasks').then(r => r.json()),
      ]);
      setStats({ pipeline, tasks: tasks.tasks?.length || 0 });
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
        <p className="text-white/40 text-sm mb-6">System overview and channel status</p>

        {/* Channel status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <ChannelCard name="Web Chat" status="online" icon="💬" />
          <ChannelCard name="Email" status="online" icon="📧" />
          <ChannelCard name="SMS" status="online" icon="📱" />
          <ChannelCard name="Voice" status="standby" icon="🎙️" />
        </div>

        {/* System stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-6">
            <h3 className="font-medium mb-4">Agent Configuration</h3>
            <div className="space-y-3 text-sm">
              <ConfigRow label="Orchestrator" value="Marvvy Core v1.0" />
              <ConfigRow label="CRM Agent" value="Active — 12 tools" />
              <ConfigRow label="Operations Agent" value="Active — 10 tools" />
              <ConfigRow label="Consulting Agent" value="Active — 8 tools" />
              <ConfigRow label="Utility Tools" value="Active — 10 tools" />
              <ConfigRow label="Total Tools" value="40" />
              <ConfigRow label="LLM Provider" value="OpenAI (via AI SDK)" />
              <ConfigRow label="Memory System" value="4-layer (Working, Short, Long, Episodic)" />
              <ConfigRow label="Reflection Engine" value="Enabled (threshold: 75)" />
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="font-medium mb-4">Quick Stats</h3>
            {stats ? (
              <div className="space-y-3 text-sm">
                <ConfigRow label="Pipeline Value" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stats.pipeline.totalValue)} />
                <ConfigRow label="Active Deals" value={String(stats.pipeline.totalDeals)} />
                <ConfigRow label="Tasks" value={String(stats.tasks)} />
              </div>
            ) : (
              <p className="text-white/40 text-sm">Loading stats...</p>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="glass rounded-xl p-6 mt-6">
          <h3 className="font-medium mb-4">Quick Links</h3>
          <div className="flex gap-3">
            <a
              href="/admin/documents"
              className="px-4 py-2 rounded-lg bg-violet-600/30 border border-violet-500/30 text-sm hover:bg-violet-600/50 transition-all"
            >
              📚 Manage Company Docs
            </a>
            <a
              href="/"
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-all"
            >
              💬 Chat with Marvvy
            </a>
          </div>
        </div>

        {/* Design patterns */}
        <div className="glass rounded-xl p-6 mt-6">
          <h3 className="font-medium mb-4">Agent Design Patterns Implemented</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { name: 'Orchestrator-Workers', tier: 'Core' },
              { name: 'Reflection', tier: 'Core' },
              { name: 'Tool Use', tier: 'Core' },
              { name: 'ReAct', tier: 'Core' },
              { name: 'Memory Management', tier: 'Advanced' },
              { name: 'Planning', tier: 'Core' },
              { name: 'Routing', tier: 'Workflow' },
              { name: 'Human-in-the-Loop', tier: 'Safety' },
              { name: 'Context Engineering', tier: 'Advanced' },
              { name: 'Parallelization', tier: 'Workflow' },
            ].map((pattern, i) => (
              <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                <p className="font-medium">{pattern.name}</p>
                <p className="text-xs text-white/40">{pattern.tier}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelCard({ name, status, icon }: { name: string; status: string; icon: string }) {
  const statusColor = status === 'online' ? 'text-emerald-400' : status === 'standby' ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="glass rounded-xl p-4">
      <span className="text-2xl">{icon}</span>
      <p className="font-medium text-sm mt-2">{name}</p>
      <p className={`text-xs mt-0.5 capitalize ${statusColor}`}>
        <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${status === 'online' ? 'bg-emerald-400 animate-pulse' : status === 'standby' ? 'bg-yellow-400' : 'bg-red-400'}`} />
        {status}
      </p>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/50">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
