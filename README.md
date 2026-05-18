# Klypup — Dynamic Pricing Intelligence Dashboard

> Klypup Applied AI Intern Assessment — **Option B**

A full-stack web application where an AI-powered multi-agent system monitors market conditions, generates pricing recommendations with confidence scores, and routes them through a human-in-the-loop approval workflow before executing price changes.

**The problem it solves:** E-commerce pricing teams spend 70%+ of their time gathering data manually. This app automates that pipeline, giving analysts a queue of AI-generated recommendations to review instead of a spreadsheet.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Fast SPA, Vite HMR, no SSR needed for a dashboard |
| Styling | Tailwind CSS + shadcn/ui + framer-motion | Utility CSS, accessible components, spring animations |
| Backend | FastAPI (Python 3.12) | Async-native, auto OpenAPI docs, Pydantic validation |
| Database | MongoDB + Beanie ODM | Flexible schema; all 5 agent outputs embedded in one document |
| AI | Cerebras → Gemini → Groq (priority order) | Multi-provider fallback; Cerebras free tier is fastest |
| Auth | JWT (15 min access + 7 day refresh) | Stateless; `org_id` + `role` baked into every token |
| Caching | In-memory TTL cache (`utils/cache.py`) | Avoids repeated DB reads per tool call within the same run |
| Rate Limiting | Custom sliding-window middleware | No external deps; protects auth and run trigger endpoints |
| DevOps | Docker Compose | One-command local setup for Mongo + backend + frontend |

---

## Features

| Feature | Implementation |
|---|---|
| **Signup / Login / Logout** | `routes/auth.py` → `services/auth_service.py` — JWT with refresh rotation |
| **Role-based access** | `dependencies.py` — `require_admin` / `require_analyst` FastAPI guards |
| **Multi-tenant isolation** | `org_id` extracted from JWT on every request — never from request body |
| **Product Catalog** | Filter, sort, search across 500+ SKUs with margin and stock status |
| **5-Agent AI Pipeline** | Market Intelligence → Demand Forecasting → Inventory & Cost → Pricing Strategy → Execution Compliance |
| **Animated pipeline UI** | Live animated agent workflow modal with SSE progress, mini-pill when hidden |
| **Recommendation Detail** | Per-agent accordion with tool call traces, output signals, raw JSON |
| **Approval Workflow** | Approve / reject / modify — auto-executes when confidence ≥ threshold |
| **Audit Trail** | Immutable log of every price action, CSV export with JWT auth |
| **Admin Config Panel** | Confidence thresholds, margin floors, escalation rules per org |
| **TTL Caching** | Tool call results cached 5–60 min — eliminates redundant DB reads |
| **Rate Limiting** | Sliding-window: 10/min on auth, 5/min on run triggers, 200/min general |
| **Dark / Light Mode** | CSS `darkMode: "class"` + localStorage persistence, no flash on load |
| **Email validation** | Frontend regex + backend `EmailStr` — double-layer enforcement |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- At least one AI API key — pick any one provider:

| Provider | Key name in `.env` | Free tier |
|---|---|---|
| **Cerebras** (fastest, recommended) | `CEREBRAS_API_KEY` | [cloud.cerebras.ai](https://cloud.cerebras.ai) |
| Google Gemini | `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) |
| Groq | `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |

---

## Setup & Run

```bash
# 1. Clone
git clone <your-repo-url>
cd Klypup

# 2. Environment variables
cp .env.example .env

# Open .env and set at least one of:
#   CEREBRAS_API_KEY=...   ← recommended
#   GEMINI_API_KEY=...
#   GROQ_API_KEY=...
# Also set:
#   JWT_SECRET=any-long-random-string

# 3. Start all services
docker compose up

# 4. Seed demo data (first time only — ~4 600 documents)
docker compose exec backend python -m app.utils.seed

# 5. Open the app
# Frontend  → http://localhost:5173
# API docs  → http://localhost:8000/api/docs
```

---

## Demo Accounts

Two fully-isolated organisations are seeded. Use two different browsers to test multi-tenancy side by side.

| Email | Password | Role | Org |
|---|---|---|---|
| `admin@acme.com` | `password123` | Admin | Acme Corp |
| `analyst@acme.com` | `password123` | Pricing Analyst | Acme Corp |
| `admin@globex.com` | `password123` | Admin | Globex Inc |
| `analyst@globex.com` | `password123` | Pricing Analyst | Globex Inc |

---

## Adding Users

| Goal | How |
|---|---|
| Add a user to your org | Sidebar → **Team** → **Invite user** → set role |
| Promote analyst to admin | **Team** → Role dropdown → Admin |
| Create a new tenant | **Create account** tab on the login page |

---

## Key Pages

| Page | Path | Access |
|---|---|---|
| Dashboard | `/` | All |
| Products | `/products` | All |
| Recommendations | `/recommendations` | All — **Run Pricing** button here |
| Recommendation Detail | `/recommendations/:id` | All |
| Pricing Runs | `/runs` | All — **Run Pricing** also here |
| Audit Trail | `/audit` | All |
| Settings | `/settings` | Admin only |
| Team | `/users` | Admin only |

---

## Architecture & Decisions

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System diagram, data flow, DB schema, AI orchestration, multi-tenant enforcement, API reference
- [docs/DECISIONS.md](docs/DECISIONS.md) — Tech choices, trade-offs, what would be improved with more time

---

## Known Limitations

- Competitor price data is mock (no live web scraper)
- Demand signals are synthetic (no Google Trends integration)
- SSE run progress uses in-memory queues — does not work across multiple backend instances (Redis pub/sub would fix this)
- Org invitations show credentials directly in UI — no email sending (no SMTP setup)
- In-memory TTL cache resets on container restart — no Redis persistence
