'use client';

import { useState, useRef, useEffect } from 'react';
import { v4 as uuid } from 'uuid';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  toolCalls?: { name: string; result: any }[];
  isStreaming?: boolean;
}

const SUGGESTIONS = [
  { icon: '👥', text: 'Search for a contact', prompt: 'Search for a contact named Acme Corp' },
  { icon: '📊', text: 'Show pipeline overview', prompt: 'Show me the current sales pipeline' },
  { icon: '✅', text: 'Create a task', prompt: 'Create a high priority task for Q3 review' },
  { icon: '🔍', text: 'Research a topic', prompt: 'Research market trends in the SaaS industry' },
  { icon: '📅', text: 'Schedule a meeting', prompt: "Check my calendar for next week and schedule a meeting" },
  { icon: '📈', text: 'Generate a report', prompt: 'Generate a pipeline report for this month' },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setShowSuggestions(false);

    const userMsg: Message = {
      id: uuid(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Create streaming placeholder
    const agentMsgId = uuid();
    const agentMsg: Message = {
      id: agentMsgId,
      role: 'agent',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      toolCalls: [],
    };
    setMessages(prev => [...prev, agentMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId,
          channelType: 'web',
          stream: false,
        }),
      });

      const data = await response.json();

      if (data.conversationId) setConversationId(data.conversationId);

      setMessages(prev =>
        prev.map(m =>
          m.id === agentMsgId
            ? {
                ...m,
                content: data.text || 'Sorry, I had trouble processing that.',
                isStreaming: false,
                toolCalls: data.toolCalls || [],
              }
            : m
        )
      );
    } catch (error) {
      setMessages(prev =>
        prev.map(m =>
          m.id === agentMsgId
            ? { ...m, content: 'Sorry, something went wrong. Please try again.', isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestion = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Chat header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Marvvy Chat</h2>
          <p className="text-xs text-white/40">CRM · Operations · Consulting</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {showSuggestions && messages.length === 0 && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-violet-500/25">
              M
            </div>
            <h2 className="text-xl font-semibold mb-2">Hello, I'm Marvvy 👋</h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Your veteran AI agent for CRM, operations, and consulting. I can help you manage contacts, track deals, automate workflows, and provide strategic insights.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(s.prompt)}
                  className="text-left p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-sm group"
                >
                  <span className="mr-2">{s.icon}</span>
                  <span className="text-white/70 group-hover:text-white transition-colors">
                    {s.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-enter flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'agent' && (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                  M
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-violet-600/30 border border-violet-500/20'
                    : 'glass'
                }`}
              >
                {msg.isStreaming ? (
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                )}

                {/* Tool calls */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-white/40 mb-1.5">Tools used:</p>
                    {msg.toolCalls.map((tc, i) => (
                      <span
                        key={i}
                        className="inline-block px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs mr-1.5 mb-1"
                      >
                        🔧 {tc.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                  U
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Marvvy anything..."
              disabled={isLoading}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 transition-all disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-white/10 disabled:text-white/30 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <span className="typing-indicator p-0">
                  <span /><span /><span />
                </span>
              ) : (
                <>
                  <span>Send</span>
                  <span className="text-xs">↵</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-white/20 text-center mt-2">
            Marvvy can access CRM data, manage tasks, and provide consulting insights
          </p>
        </div>
      </div>
    </div>
  );
}
