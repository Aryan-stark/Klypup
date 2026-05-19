# Klypup — Dynamic Pricing Intelligence Dashboard


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
| **Admin Config Panel** | Confidence thresholds, margin floors, price caps, escalation rules per org |
| **AI Provider Config** | Set provider / model / API key per-org in Settings UI with live connection test |
| **Invite flow** | Admin generates a single-use invite link; invitee sets their own password on `/join` |
| **TTL Caching** | Tool call results cached 5–60 min — eliminates redundant DB reads |
| **Rate Limiting** | Sliding-window: 10/min on auth, 5/min on run triggers, 200/min general |
| **Dark / Light Mode** | CSS `darkMode: "class"` + localStorage persistence, no flash on load |
| **Email validation** | Frontend regex + backend `EmailStr` — double-layer enforcement |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- At least one AI API key — pick any provider (priority: Cerebras → Gemini → Groq):

| Provider | Env var | Free tier |
|---|---|---|
| **Cerebras** (fastest, recommended) | `CEREBRAS_API_KEY` | [cloud.cerebras.ai](https://cloud.cerebras.ai) |
| Google Gemini | `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) |
| Groq | `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |

You can also set the provider per-organisation after login in **Settings → AI Configuration** without touching `.env`.

---

## Setup & Run

```bash
# 1. Clone
git clone <your-repo-url>
cd Klypup

# 2. Environment variables
cp .env.example .env
```

Open `.env` and fill in the required values:

```bash
# Required — pick at least one AI provider key
CEREBRAS_API_KEY=csk-...        # recommended (fastest free tier)
# GEMINI_API_KEY=AIza...
# GROQ_API_KEY=gsk_...

# Required — any long random string (used to sign JWTs)
JWT_SECRET=change-me-to-a-long-random-string

# These are pre-filled correctly for Docker — do not change unless you know why
MONGODB_URL=mongodb://mongo:27017
VITE_API_URL=http://localhost:8000/api/v1
```

```bash
# 3. Start all three services (MongoDB + backend + frontend)
docker compose up

# First run takes ~2–3 min to pull images and install dependencies.
# You'll see "MongoDB connected and Beanie initialized." when the backend is ready.

# 4. Seed demo data (first time only — ~4 600 documents across 2 orgs)
docker compose exec backend python -m app.utils.seed

# 5. Open the app
# Frontend  → http://localhost:5173
# API docs  → http://localhost:8000/api/docs
# Health    → http://localhost:8000/health
```

### Running without Docker

If you prefer to run services directly:

```bash
# Terminal 1 — MongoDB (or use MongoDB Atlas / local install)
# Ensure MongoDB is running on localhost:27017

# Terminal 2 — Backend
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env         # edit as above, set MONGODB_URL=mongodb://localhost:27017
uvicorn app.main:app --reload --port 8000

# Terminal 3 — Frontend
cd frontend
npm install
# Create frontend/.env with:
#   VITE_API_URL=http://localhost:8000/api/v1
npm run dev
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
| Invite a team member | Sidebar → **Team** → **Invite user** → enter email + role → copy the generated link → send it to them |
| Accept an invite | Open the link → `/join?token=...` → enter your name + password → logged in immediately |
| Promote analyst to admin | **Team** → Role dropdown → Admin |
| Deactivate a user | **Team** → Deactivate button |
| Create a new isolated org | **Create account** tab on the login page |

Invite links are single-use, expire after 7 days, and do not require you to share a password.
The invitee sets their own password on the `/join` page.

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
- SSE run progress uses in-memory queues — does not survive backend restarts or scale beyond one instance (Redis pub/sub would fix this)
- Invite links must be shared manually (copy/paste) — no SMTP email sending
- In-memory TTL cache resets on container restart — no Redis persistence
- Free-tier AI providers have rate limits; the pipeline retries on 429 but may be slow under concurrent runs
