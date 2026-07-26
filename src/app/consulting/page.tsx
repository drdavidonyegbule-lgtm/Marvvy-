'use client';

import { useState } from 'react';

const CONSULTING_ACTIONS = [
  { id: 'research', icon: '🔍', title: 'Research Topic', description: 'Deep dive into any business topic', placeholder: 'E.g., Market trends in African fintech 2026' },
  { id: 'swot', icon: '📋', title: 'SWOT Analysis', description: 'Strengths, weaknesses, opportunities, threats', placeholder: 'E.g., Analyze our company: TechCorp, SaaS industry' },
  { id: 'strategy', icon: '🎯', title: 'Strategic Plan', description: 'Goals-based strategy generation', placeholder: 'E.g., Goals: expand to 3 new markets, grow revenue 40%' },
  { id: 'competitive', icon: '🏆', title: 'Competitive Analysis', description: 'Landscape and positioning analysis', placeholder: 'E.g., Analyze competitors for Paystack' },
  { id: 'recommend', icon: '💡', title: 'Recommendations', description: 'Actionable business recommendations', placeholder: 'E.g., Improve customer retention in e-commerce' },
  { id: 'financial', icon: '💰', title: 'Financial Model', description: 'Projections and scenario modeling', placeholder: 'E.g., 3-year projection for SaaS startup at $50K MRR' },
];

export default function ConsultingPage() {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || !selectedAction || isLoading) return;
    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          topic: input,
          context: input,
          entity: input,
        }),
      });
      const data = await res.json();
      setResult(data.text || 'Analysis complete. Check the response above.');
    } catch (e) {
      setResult('Sorry, something went wrong. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Consulting</h2>
          <p className="text-white/40 text-sm">Strategic analysis, research, and recommendations</p>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {CONSULTING_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => {
                setSelectedAction(action.id);
                setResult(null);
                setInput('');
              }}
              className={`text-left p-5 rounded-xl border transition-all ${
                selectedAction === action.id
                  ? 'border-violet-500/50 bg-violet-500/10'
                  : 'border-white/10 glass hover:border-white/20'
              }`}
            >
              <span className="text-2xl mb-2 block">{action.icon}</span>
              <h3 className="font-medium text-sm">{action.title}</h3>
              <p className="text-xs text-white/40 mt-1">{action.description}</p>
            </button>
          ))}
        </div>

        {/* Input & result area */}
        {selectedAction && (
          <div className="glass rounded-xl p-6">
            <h3 className="font-medium mb-4">
              {CONSULTING_ACTIONS.find(a => a.id === selectedAction)?.title}
            </h3>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder={CONSULTING_ACTIONS.find(a => a.id === selectedAction)?.placeholder}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-all"
              />
              <button
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                className="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-white/10 disabled:text-white/30 rounded-xl text-sm font-medium transition-all"
              >
                {isLoading ? 'Analyzing...' : 'Run'}
              </button>
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-white/40">
                <div className="typing-indicator p-0">
                  <span /><span /><span />
                </div>
                Marvvy is analyzing...
              </div>
            )}

            {result && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl">
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{result}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
