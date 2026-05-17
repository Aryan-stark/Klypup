# Klypup — Dynamic Pricing Intelligence Dashboard

> Klypup Applied AI Intern Assessment — **Option B**

A full-stack web application with an AI-powered multi-agent pricing engine.
Analysts review AI-generated price recommendations through a human-in-the-loop
approval workflow instead of manually gathering pricing data in spreadsheets.

---

## Why Option B

Option B maps directly to real product problems — workflow automation, multi-agent
coordination, and human oversight of AI decisions. The multi-agent architecture
with per-agent explainability is more technically interesting to build and
demonstrate than a single-model research query.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Fast SPA build, no SSR needed for a dashboard |
| Styling | Tailwind CSS + shadcn/ui | Utility CSS + accessible headless components |
| Backend | FastAPI (Python 3.12) | Async, automatic OpenAPI docs, great for AI pipelines |
| Database | MongoDB + Beanie ODM | Flexible schema; agent reasoning embedded in recommendation docs |
| AI | Groq API — `llama-3.3-70b-versatile` | Fast inference, free tier, OpenAI-compatible tool use |
| Auth | JWT (access + refresh tokens) | Stateless; org_id + role baked into claims |
| DevOps | Docker Compose | One-command local setup |

---

## Features

- **Auth** — Signup, login, logout, protected routes, JWT refresh
- **Multi-tenant** — Organizations are fully isolated; data never leaks between orgs
- **Roles** — Admin (full control) and Pricing Analyst (review + approve)
- **Product Catalog** — 500+ SKUs with price, margin, stock, and AI status
- **AI Pricing Engine** — 5 specialized agents collaborate to produce recommendations
- **Recommendation Detail** — Full per-agent reasoning with tool-call traces
- **Approval Workflow** — Approve / reject / modify with configurable auto-execution
- **Audit Trail** — Immutable record of every price change, filterable and searchable
- **Admin Config Panel** — Confidence thresholds, margin floors, escalation rules

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A free Groq API key → [console.groq.com](https://console.groq.com)

---

## Setup & Run

```bash
# 1. Clone
git clone <your-repo-url>
cd Klypup

# 2. Set environment variables
cp .env.example .env
# Open .env and fill in:
#   GROQ_API_KEY=gsk_...
#   JWT_SECRET=any-long-random-string

# 3. Start everything
docker compose up

# 4. Seed demo data (first time only)
docker compose exec backend python -m app.utils.seed

# 5. Open the app
# Frontend  → http://localhost:5173
# API docs  → http://localhost:8000/api/docs
```

---

## Demo Accounts

After seeding, two organisations with two users each are available:

| Email | Password | Role | Org |
|---|---|---|---|
| admin@acme.com | password123 | Admin | Acme Corp |
| analyst@acme.com | password123 | Pricing Analyst | Acme Corp |
| admin@globex.com | password123 | Admin | Globex Inc |
| analyst@globex.com | password123 | Pricing Analyst | Globex Inc |

---

## Screenshots

> _Coming — added after UI is built_

| Screen | Description |
|---|---|
| Dashboard | KPI cards + pending approvals + activity feed |
| Product Catalog | Filterable SKU table with margin and AI status |
| Recommendation Queue | Sorted by confidence, bulk approve |
| Recommendation Detail | Per-agent reasoning accordion + tool call traces |
| Audit Trail | Full searchable history of all price changes |
| Settings | Admin threshold and margin floor config |

---

## Project Structure

See [CLAUDE.md](CLAUDE.md) for the full annotated project map.

---

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system diagrams, data flow,
DB schema, and API endpoint list.

---

## Decisions & Trade-offs

See [docs/DECISIONS.md](docs/DECISIONS.md) for tech choices, trade-offs,
and what would be improved with more time.

---

## Known Limitations

- Competitor price data is mock (no live scraper)
- Demand signals are synthetic (no Google Trends integration)
- SSE run progress uses in-memory queue — does not work across multiple backend instances
- No email sending for org invitations (invite code shown in UI instead)

---

## Running Tests

```bash
# Backend
docker compose exec backend pytest

# Frontend
docker compose exec frontend npm run test
```
