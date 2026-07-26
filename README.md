# Marvvy — Omnichannel AI Agent

> **Veteran Operational, CRM & Consultant Agent**

Marvvy is a full-stack omnichannel AI agent built with Next.js 16 and the Vercel AI SDK v6. She operates across web, email, SMS, voice, and social channels with a unified brain, providing CRM, operations, and consulting capabilities.

## Quick Start

```bash
# Install dependencies
npm install

# Set up your OpenAI API key
export OPENAI_API_KEY=sk-...

# Run development server
npm run dev
```

Visit `http://localhost:3000` to chat with Marvvy.

## Architecture

Marvvy implements 10 of the 12 foundational agentic design patterns:

| Pattern | Implementation |
|---------|---------------|
| Orchestrator-Workers | Marvvy Core routes to CRM/Ops/Consulting sub-agents |
| Reflection | Self-evaluation with auto-correction (threshold: 75) |
| Tool Use | 40 tools across CRM, Ops, Consulting, and Utility |
| ReAct | Reason → Act → Observe loop |
| Memory Management | 4-layer: Working, Short-term, Long-term, Episodic |
| Planning | Multi-step task decomposition |
| Routing | Intent classifier dispatches to specialized agents |
| Human-in-the-Loop | Escalation for high-stakes decisions |
| Context Engineering | Smart context selection and compression |
| Parallelization | Concurrent sub-agent calls for independent tasks |

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Chat interface (main page)
│   ├── layout.tsx            # Root layout with sidebar
│   ├── crm/page.tsx          # CRM dashboard
│   ├── ops/page.tsx          # Operations dashboard
│   ├── consulting/page.tsx   # Consulting tools
│   ├── admin/page.tsx        # Admin overview
│   └── api/
│       ├── chat/route.ts     # Main agent API (streaming + non-streaming)
│       ├── crm/              # CRM REST endpoints
│       ├── ops/              # Operations REST endpoints
│       └── consult/route.ts  # Consulting API
├── lib/
│   ├── agents/
│   │   ├── orchestrator.ts   # Marvvy Core — main agent loop
│   │   ├── crm.ts            # CRM sub-agent tools
│   │   ├── ops.ts            # Operations sub-agent tools
│   │   └── consulting.ts     # Consulting sub-agent tools
│   ├── tools/
│   │   ├── crm/index.ts      # 12 CRM tools
│   │   ├── ops/index.ts      # 10 Operations tools
│   │   ├── consulting/index.ts # 8 Consulting tools
│   │   └── utility/index.ts  # 10 Utility tools
│   ├── db/schema.ts          # SQLite database + schema
│   └── memory/index.ts       # 4-layer memory system
└── components/               # UI components
```

## Channels

| Channel | Status | Technology |
|---------|--------|------------|
| Web Chat | ✅ Active | Next.js + AI SDK streaming |
| Email | ✅ Ready | Webhook-ready (SendGrid/Resend) |
| SMS | ✅ Ready | Webhook-ready (Twilio) |
| Voice | 🔄 Standby | Webhook-ready (Twilio + TTS/STT) |
| Social | 🔄 Planned | Meta Graph API |

## Full documentation

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete system design including:
- Data model with full SQL schema
- Channel adapter design
- Security & compliance
- Deployment architecture
- 12-week implementation roadmap
- Complete tool registry (40 tools)
