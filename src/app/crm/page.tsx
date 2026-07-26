'use client';

import { useState, useEffect } from 'react';

interface PipelineStage {
  stage: string;
  count: number;
  total_value: number;
  avg_probability: number;
}

interface Deal {
  id: string;
  name: string;
  stage: string;
  value: number;
  probability: number;
  close_date: string;
}

export default function CRMPage() {
  const [pipeline, setPipeline] = useState<{ stages: PipelineStage[]; totalValue: number; totalDeals: number; deals: Deal[] } | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'contacts' | 'leads'>('pipeline');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pipelineRes, contactsRes] = await Promise.all([
        fetch('/api/crm/pipeline'),
        fetch('/api/crm/contacts?limit=20'),
      ]);
      setPipeline(await pipelineRes.json());
      const contactsData = await contactsRes.json();
      setContacts(contactsData.contacts || []);
    } catch (e) {
      console.error('Failed to load CRM data:', e);
    }
    setLoading(false);
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const stageColors: Record<string, string> = {
    discovery: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    qualification: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    proposal: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    negotiation: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    closed_won: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    closed_lost: 'bg-red-500/20 text-red-300 border-red-500/30',
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">CRM Dashboard</h2>
            <p className="text-white/40 text-sm">Pipeline, contacts, and lead management</p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-all"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Quick stats */}
        {pipeline && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Pipeline" value={formatCurrency(pipeline.totalValue)} trend="+12%" />
            <StatCard label="Active Deals" value={String(pipeline.totalDeals)} trend="+3" />
            <StatCard label="Avg Probability" value={`${Math.round(pipeline.stages.reduce((s, st) => s + st.avg_probability * st.count, 0) / (pipeline.totalDeals || 1))}%`} trend="" />
            <StatCard label="Contacts" value={String(contacts.length)} trend="" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
          {(['pipeline', 'contacts', 'leads'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm capitalize transition-all ${
                activeTab === tab ? 'bg-violet-600 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-white/40">Loading CRM data...</div>
        ) : (
          <>
            {/* Pipeline View */}
            {activeTab === 'pipeline' && pipeline && (
              <div className="space-y-4">
                {pipeline.stages.map((stage) => (
                  <div key={stage.stage} className="glass rounded-xl p-5 pipeline-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs border ${stageColors[stage.stage] || 'bg-white/10 text-white/60 border-white/20'}`}>
                          {stage.stage.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm text-white/50">{stage.count} deals</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(stage.total_value)}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (stage.total_value / (pipeline.totalValue || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}

                {/* Deal list */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-white/60 mb-3">All Deals</h3>
                  <div className="glass rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 text-xs">
                          <th className="text-left p-3">Deal</th>
                          <th className="text-left p-3">Stage</th>
                          <th className="text-right p-3">Value</th>
                          <th className="text-right p-3">Probability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pipeline.deals.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-white/30">
                              No deals yet. Chat with Marvvy to create your first deal!
                            </td>
                          </tr>
                        ) : (
                          pipeline.deals.map((deal: Deal) => (
                            <tr key={deal.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="p-3">{deal.name}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs border ${stageColors[deal.stage] || ''}`}>
                                  {deal.stage.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="p-3 text-right">{formatCurrency(deal.value)}</td>
                              <td className="p-3 text-right">{deal.probability}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Contacts View */}
            {activeTab === 'contacts' && (
              <div className="glass rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 text-xs">
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Company</th>
                      <th className="text-left p-3">Role</th>
                      <th className="text-left p-3">Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-white/30">
                          No contacts yet. Chat with Marvvy to add your first contact!
                        </td>
                      </tr>
                    ) : (
                      contacts.map((c: any) => (
                        <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-3 font-medium">{c.name}</td>
                          <td className="p-3 text-white/60">{c.email || '—'}</td>
                          <td className="p-3">{c.company || '—'}</td>
                          <td className="p-3 text-white/60">{c.role || '—'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs">{c.channel_origin}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Leads View */}
            {activeTab === 'leads' && (
              <div className="text-center py-16">
                <p className="text-white/40">Ask Marvvy to search or create leads!</p>
                <p className="text-white/20 text-sm mt-1">Try: "Show me all leads" or "Create a new lead for..."</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-white/40 text-xs mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {trend && <p className={`text-xs mt-1 ${trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>{trend}</p>}
    </div>
  );
}
