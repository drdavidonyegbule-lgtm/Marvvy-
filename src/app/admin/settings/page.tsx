'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [token, setToken] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramActive, setTelegramActive] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [handoffFilter, setHandoffFilter] = useState('all');

  useEffect(() => {
    const saved = localStorage.getItem('marvvy_token');
    if (saved) { setToken(saved); setLoggedIn(true); loadAll(saved); }
  }, []);

  const loadAll = (t: string) => { loadConversations(t); loadChannelConfigs(t); };

  const login = async () => {
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setup', admins: [{ email: adminName, name: adminName.split('@')[0], password: adminPassword }] }),
    });
    const data = await res.json();
    if (data.success && data.admins?.length) {
      // Now login with that admin
      const loginRes = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: adminName, password: adminPassword }),
      });
      const loginData = await loginRes.json();
      if (loginData.token) {
        localStorage.setItem('marvvy_token', loginData.token);
        setToken(loginData.token);
        setLoggedIn(true);
        loadAll(loginData.token);
      }
    } else {
      // Try login directly (already setup)
      const loginRes = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: adminName, password: adminPassword }),
      });
      const loginData = await loginRes.json();
      if (loginData.token) {
        localStorage.setItem('marvvy_token', loginData.token);
        setToken(loginData.token);
        setLoggedIn(true);
        loadAll(loginData.token);
      } else {
        setError(data.error || loginData.error || 'Login failed');
      }
    }
  };

  const loadConversations = async (t: string) => {
    const res = await fetch(`/api/conversations/handoff?filter=${handoffFilter}`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setConversations(data.conversations || []);
  };

  const loadChannelConfigs = async (t: string) => {
    const res = await fetch('/api/admin/channels', { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    const tg = (data.channels || []).find((c: any) => c.channel_type === 'telegram');
    if (tg) { const cfg = JSON.parse(tg.config); setTelegramToken(cfg.botToken || ''); setTelegramActive(!!tg.is_active); }
  };

  const handoffAction = async (convId: string, action: string) => {
    await fetch('/api/conversations/handoff', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ conversationId: convId, action }),
    });
    loadConversations(token);
  };

  const saveChannel = async () => {
    setSaveStatus('');
    const res = await fetch('/api/admin/channels', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channelType: 'telegram', config: { botToken: telegramToken }, isActive: telegramActive }),
    });
    const data = await res.json();
    setSaveStatus(data.success ? 'Saved!' : `Error: ${data.error}`);
  };

  if (!loggedIn) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto mt-20">
          <div className="glass rounded-xl p-8">
            <h2 className="text-xl font-bold mb-2">Admin Setup</h2>
            <p className="text-white/40 text-sm mb-6">Create your super admin account. Only you and your boss can access.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/40 block mb-1">Email</label>
                <input type="email" value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="you@company.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50" />
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1">Password</label>
                <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Set a strong password"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50"
                  onKeyDown={e => e.key === 'Enter' && login()} />
              </div>
              {error && <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg">{error}</div>}
              <button onClick={login} className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium">Login / Set Up</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Settings</h2>

        {/* Channel Config */}
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="font-medium text-lg mb-4">Telegram Bot</h3>
          <div className="border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium">Bot Configuration</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={telegramActive} onChange={e => setTelegramActive(e.target.checked)} className="w-4 h-4 accent-violet-500" />
                <span className="text-xs text-white/50">Active</span>
              </label>
            </div>
            <div className="flex gap-2">
              <input type="text" value={telegramToken} onChange={e => setTelegramToken(e.target.value)} placeholder="Bot Token from @BotFather"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50" />
              <button onClick={saveChannel} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm">Save</button>
            </div>
            <p className="text-xs text-white/20 mt-2">Create bot with @BotFather on Telegram, paste token, click Save.</p>
          </div>
          {saveStatus && <div className={`mt-3 p-3 rounded-lg text-sm ${saveStatus.startsWith('Saved') ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>{saveStatus}</div>}
        </div>

        {/* WhatsApp */}
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="font-medium text-lg mb-4">WhatsApp Business</h3>

          {/* Option 1: Meta Direct */}
          <div className="border border-emerald-500/30 rounded-xl p-4 mb-4 bg-emerald-500/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">RECOMMENDED</span>
              <p className="font-medium">Meta Cloud API (Direct — No Twilio)</p>
            </div>
            <p className="text-xs text-white/50 mb-3">
              Free tier: 1,000 conversations/month. Connect directly to Meta. No middleman.
            </p>
            <div className="space-y-2 text-xs font-mono text-white/40">
              <div><code className="text-emerald-300">META_WHATSAPP_TOKEN</code> — permanent access token from Meta App</div>
              <div><code className="text-emerald-300">META_WHATSAPP_PHONE_ID</code> — your WhatsApp phone number ID</div>
              <div><code className="text-emerald-300">META_WHATSAPP_VERIFY_TOKEN</code> — any string, e.g. "marvvy-webhook"</div>
            </div>
            <p className="text-xs text-white/20 mt-3">
              Webhook URL: <code className="text-emerald-400">https://yourdomain.com/api/webhooks/whatsapp/meta</code>
            </p>
          </div>

          {/* Option 2: Twilio */}
          <div className="border border-white/10 rounded-xl p-4">
            <p className="font-medium mb-2">Via Twilio (Alternative)</p>
            <div className="space-y-2 text-xs font-mono text-white/40">
              <div><code className="text-violet-300">TWILIO_ACCOUNT_SID</code> — your Twilio Account SID</div>
              <div><code className="text-violet-300">TWILIO_AUTH_TOKEN</code> — your Twilio Auth Token</div>
              <div><code className="text-violet-300">TWILIO_WHATSAPP_NUMBER</code> — your WhatsApp sender number</div>
            </div>
            <p className="text-xs text-white/20 mt-2">Webhook: https://yourdomain.com/api/webhooks/whatsapp</p>
          </div>
        </div>

        {/* Handoff */}
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="font-medium text-lg mb-4">Human Takeover</h3>
          <p className="text-white/40 text-sm mb-4">Take over a conversation and Marvvy stops. She resumes after 10 minutes of your silence.</p>
          <div className="flex gap-1 mb-4 bg-white/5 rounded-lg p-1 w-fit">
            {(['all', 'human', 'agent'] as const).map(f => (
              <button key={f} onClick={() => { setHandoffFilter(f); loadConversations(token); }}
                className={`px-3 py-1 rounded-md text-xs capitalize ${handoffFilter === f ? 'bg-violet-600 text-white' : 'text-white/50'}`}>
                {f === 'human' ? 'My Chats' : f === 'agent' ? 'Marvvy Chats' : 'All'}
              </button>
            ))}
          </div>
          {conversations.length === 0 ? (
            <p className="text-center py-8 text-white/30 text-sm">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((c: any) => (
                <div key={c.id} className="border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.subject || c.customer_name}</p>
                    <p className="text-xs text-white/40">{c.customer_name} · {c.channel_origin} · {c.handoff_status === 'human' ? 'You have control' : 'Marvvy handling'}</p>
                  </div>
                  {c.handoff_status === 'agent' ? (
                    <button onClick={() => handoffAction(c.id, 'takeover')} className="px-3 py-1.5 bg-yellow-600/30 border border-yellow-500/30 rounded-lg text-xs">Take Over</button>
                  ) : (
                    <button onClick={() => handoffAction(c.id, 'release')} className="px-3 py-1.5 bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs">Release</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Token */}
        <div className="glass rounded-xl p-6">
          <h3 className="font-medium text-lg mb-2">API Token</h3>
          <code className="block p-3 bg-white/5 rounded-lg text-xs text-violet-300 break-all">Bearer {token}</code>
        </div>
      </div>
    </div>
  );
}
