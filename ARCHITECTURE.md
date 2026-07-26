# Marvvy — Omnichannel AI Agent Architecture

> **Veteran Operational, CRM & Consultant Agent**
> 
> Version: 1.0 | Date: July 26, 2026

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [System Architecture](#2-system-architecture)
3. [Agent Design Patterns](#3-agent-design-patterns)
4. [Core Modules](#4-core-modules)
5. [Channel Architecture](#5-channel-architecture)
6. [Data Model](#6-data-model)
7. [API Design](#7-api-design)
8. [Security & Compliance](#8-security--compliance)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Executive Overview

### 1.1 What is Marvvy?

Marvvy is an **omnichannel AI agent** designed to serve as a veteran operational specialist, CRM expert, and strategic consultant — all accessible through any communication channel. She maintains persistent context across channels, learns from every interaction, and delivers consistent, high-quality business support.

### 1.2 Core Value Propositions

| Pillar | Description |
|--------|-------------|
| **Omnichannel Presence** | Web chat, email, SMS, voice, social media — one agent, one brain |
| **CRM Mastery** | Lead management, pipeline tracking, customer 360°, automated follow-ups |
| **Operational Excellence** | Workflow automation, task orchestration, real-time alerts, reporting |
| **Strategic Consulting** | Data-driven insights, competitive analysis, recommendation engine |
| **Cross-Channel Memory** | Every interaction informs every other — context follows the customer |

### 1.3 Agent Persona

- **Name**: Marvvy
- **Personality**: Professional, warm, proactive, data-driven
- **Tone**: Confident but approachable; adapts formality to channel (casual on SMS, polished on email)
- **Expertise**: 15+ years equivalent in CRM, business operations, and management consulting
- **Languages**: Multi-lingual with automatic detection

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CHANNEL GATEWAY                           │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │   Web    │  Email   │   SMS    │  Voice   │  Social  │      │
│  │  (Next)  │(SendGrid)│ (Twilio) │ (Twilio) │  (Meta)  │      │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┘      │
│       │          │          │          │          │              │
│       └──────────┴──────────┴──────────┴──────────┘              │
│                          │                                       │
│               ┌──────────▼──────────┐                            │
│               │   CHANNEL ADAPTER   │                            │
│               │  (Normalize + Route)│                            │
│               └──────────┬──────────┘                            │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                     MARVVY AGENT CORE                            │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 ORCHESTRATOR AGENT                         │  │
│  │  • Intent classification • Context assembly • Routing     │  │
│  │  • Multi-agent coordination • Response synthesis          │  │
│  └───────┬───────────────┬───────────────┬───────────────────┘  │
│          │               │               │                       │
│  ┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────────┐          │
│  │  CRM AGENT   │ │  OPS AGENT  │ │ CONSULTING AGENT│          │
│  │              │ │             │ │                 │          │
│  │ • Contacts   │ │ • Workflows │ │ • Analysis      │          │
│  │ • Leads      │ │ • Tasks     │ │ • Research      │          │
│  │ • Pipeline   │ │ • Alerts    │ │ • Reports       │          │
│  │ • Follow-ups │ │ • Schedules │ │ • Strategy      │          │
│  └───────┬──────┘ └──────┬──────┘ └──────┬──────────┘          │
│          │               │               │                       │
│  ┌───────┴───────────────┴───────────────┴───────────────────┐  │
│  │                    SHARED SERVICES                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │  Memory  │ │   RAG    │ │  Tools   │ │Reflection│    │  │
│  │  │  Manager │ │  Engine  │ │ Registry │ │  Engine  │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 + React 19 | Web app, admin dashboard, chat UI |
| **AI Framework** | Vercel AI SDK v6 | Agent orchestration, streaming, tool use |
| **Styling** | TailwindCSS v4 | Utility-first styling |
| **Primary DB** | SQLite (better-sqlite3) / PostgreSQL | Customer data, CRM records, ops data |
| **Cache / Sessions** | Redis (planned) | Cross-channel session state |
| **Vector Store** | pgvector / Pinecone (planned) | Knowledge base, RAG |
| **Email** | SendGrid / Resend | Outbound + inbound email |
| **SMS & Voice** | Twilio | SMS, MMS, voice calls |
| **Social** | Meta Graph API, X API | Social media integration |
| **LLM Provider** | OpenAI (via AI SDK) | Core reasoning engine |
| **Observability** | Langfuse / Helicone | LLM tracing, cost tracking |

---

## 3. Agent Design Patterns

Marvvy implements 10 of the 12 foundational agentic design patterns:

| # | Pattern | Implementation | Purpose |
|---|---------|---------------|---------|
| 1 | **Orchestrator-Workers** | Marvvy Core → CRM/Ops/Consulting sub-agents | Specialized task routing |
| 2 | **Reflection** | Post-generation self-evaluation with scoring | Output quality assurance |
| 3 | **Tool Use** | Rich tool registry with 40+ tools across domains | Capability execution |
| 4 | **ReAct** | Reason → Act → Observe loop in all agents | Grounded decision-making |
| 5 | **Memory Management** | Short-term (conversation) + Long-term (vector) + Episodic | Persistent context |
| 6 | **Planning** | Multi-step task decomposition with execution plans | Complex workflows |
| 7 | **Routing** | Intent classifier routes to correct sub-agent | Efficient dispatch |
| 8 | **Human-in-the-Loop** | Escalation triggers for high-stakes decisions | Safety & compliance |
| 9 | **Context Engineering** | Smart context selection, compression, isolation | Token efficiency |
| 10 | **Parallelization** | Concurrent sub-agent calls when tasks are independent | Latency reduction |

---

## 4. Core Modules

### 4.1 CRM Agent (12 tools)
- Contact Management (search, create, update, 360° view)
- Lead Management (capture, qualify, score, route)
- Pipeline Tracking (deals, stages, probability, forecasting)
- Follow-up Automation (smart scheduling)

### 4.2 Operations Agent (10 tools)
- Task Management (create, update, assign, track)
- Workflow Automation (define, trigger, monitor)
- Alerting & Monitoring (conditions, actions)
- Calendar & Scheduling (availability, meetings)
- Reporting & Integrations

### 4.3 Consulting Agent (8 tools)
- Business Research & Analysis
- Strategy Development (SWOT, competitive, financial modeling)
- Knowledge Base (RAG-powered search)
- Recommendations Engine

### 4.4 Utility Tools (10 tools)
- Intent classification, language detection, translation
- Summarization, entity extraction, sentiment analysis
- Web search, calculations, datetime
- Human escalation

---

## 5. Channel Architecture

| Channel | Format | Latency Target | Status |
|---------|--------|---------------|--------|
| **Web Chat** | Rich text + widgets | < 2s | ✅ Active |
| **Email** | HTML + plain text | < 30s | ✅ Ready |
| **SMS** | Plain text (1600 chars) | < 5s | ✅ Ready |
| **Voice** | Audio stream | < 1s TTFB | 🔄 Standby |
| **Social** | Platform-specific | < 10s | 🔄 Planned |

---

## 6. Data Model

Core entities: `customers`, `conversations`, `messages`, `leads`, `deals`, `tasks`, `workflows`, `knowledge_articles`, `agent_memories`.

Full SQL schema available in `src/lib/db/schema.ts`.

**Memory Architecture:**
- Layer 1: Working Memory (conversation context)
- Layer 2: Short-Term Memory (30-day recent interactions)
- Layer 3: Long-Term Memory (vector search across history)
- Layer 4: Episodic Memory (key events and decisions)

---

## 7. API Design

```
POST   /api/chat                    # Send message → Marvvy responds
GET    /api/crm/contacts            # List/search contacts
POST   /api/crm/contacts            # Create contact
GET    /api/crm/leads               # List leads
GET    /api/crm/pipeline            # Pipeline overview
GET    /api/ops/tasks               # List tasks
POST   /api/ops/tasks               # Create task
POST   /api/consult                 # Consulting actions
```

---

## 8. Implementation Roadmap

| Phase | Timeline | Focus |
|-------|----------|-------|
| **Phase 1** | Current | ✅ Architecture, web chat, core agents, SQLite, CRM basics |
| **Phase 2** | Weeks 3-4 | Operations agent, consulting agent, reflection, admin dashboard |
| **Phase 3** | Weeks 5-6 | Email, SMS channels, cross-channel context, long-term memory |
| **Phase 4** | Weeks 7-8 | Voice, social, RAG engine, human-in-the-loop |
| **Phase 5** | Weeks 9-12 | Multi-tenancy, SSO, production hardening, load testing |

---

> **Current Status**: Phase 1 complete — working prototype with chat, CRM dashboard, operations, and consulting modules.
