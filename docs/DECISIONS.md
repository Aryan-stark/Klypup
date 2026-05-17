# DECISIONS.md
## Klypup — Dynamic Pricing Intelligence Dashboard

> Answers the assessment's required questions. Fill in the "Answer" rows as you build.

---

## 1. Which option did you choose and why?

**Option B — Dynamic Pricing Intelligence Dashboard**

Option B maps directly to a real, recurring business problem — pricing teams drowning
in manual data work. The multi-agent architecture with visible per-agent reasoning is
more technically interesting than a single-model query, and the human-in-the-loop
approval workflow demonstrates understanding of how AI should work in production:
AI recommends, humans decide.

---

## 2. Why this tech stack? What alternatives did you consider?

| Decision | Chosen | Alternatives Considered | Reason for choice |
|---|---|---|---|
| Backend | FastAPI | Django, Node/Express | Async-native, auto OpenAPI docs, Pydantic validation built-in |
| Database | MongoDB + Beanie | PostgreSQL + SQLAlchemy | Agent reasoning embeds naturally in a single document; no joins needed for detail page |
| AI | Groq (`llama-3.3-70b`) | OpenAI GPT-4o, Claude Sonnet | Free tier available; OpenAI-compatible tool use API; fast inference |
| Frontend | React + Vite | Next.js, Vue | Pure SPA is sufficient for a dashboard; Vite is faster than CRA |
| Auth | JWT (access + refresh) | Supabase Auth, Auth0 | Full control, no third-party dependency, org_id baked into claims |

---

## 3. How did you approach multi-tenancy?

**Pattern: `org_id` column + dependency-layer enforcement**

Every MongoDB document has an `org_id` field. The `get_current_user()` FastAPI
dependency extracts `org_id` from the JWT — it is never read from the request body
or query parameters. Every service function receives `org_id` as a required positional
argument. Every MongoDB query filters by `org_id`.

This makes cross-tenant access structurally impossible from a correctly implemented
endpoint — no developer can accidentally forget to filter because `org_id` must
explicitly be passed to every service function.

---

## 4. How did you design the AI integration?

**Sequential pipeline with tool use per agent**

Each of the 5 agents is a separate Groq API call with:
- A distinct system prompt defining its specific responsibility
- A small set of Python tool functions it can call
- The accumulated context from all upstream agents

Key decisions:
- **Sequential not parallel** — downstream agents need to reason about disagreements
  between upstream signals. PricingStrategyAgent explicitly considers "demand is rising
  but inventory is low — raise or hold?" This nuance is lost with parallel fan-out.
- **Tool use not pre-loaded context** — agents fetch exactly the data they need via
  tool calls. This keeps prompts short and produces a visible call trace stored in DB
  and shown in the UI.
- **Status routing in Python not in AI** — the orchestrator applies the org's
  confidence thresholds with exact float comparisons. Business routing must be
  deterministic and auditable, not probabilistic.
- **Confidence narrated by agent** — PricingStrategyAgent explains its confidence
  derivation in natural language. A hardcoded formula cannot capture nuanced reasoning.

---

## 5. What trade-offs did you make given the 5-day timeline?

| Trade-off | What was cut | What was kept | Why |
|---|---|---|---|
| Real scrapers | Live competitor scraping | Mock data with realistic patterns | Scraping is a project in itself; mock is sufficient to demo the pipeline |
| Redis pub/sub | Multi-instance SSE | In-memory asyncio.Queue | Single container is fine for assessment; commented for future swap |
| Email invites | Sending emails | Invite code shown in UI | SMTP setup adds ops complexity with no demo value |
| Real Google Trends | API integration | Mock seasonal data | Free tier rate limits would break the demo |
| Unit tests | Full test suite | Smoke tests for agents | Time went to core feature correctness |

---

## 6. What would you improve with 2 more weeks?

- **Live competitor data** — integrate a real scraping service (ScraperAPI or Apify)
- **Google Trends** — real demand signals via PyTrends
- **Redis pub/sub** — replace in-memory SSE queue for multi-instance scalability
- **Agent fine-tuning** — evaluate and tune prompts with a scoring dataset
- **Email invitations** — proper org onboarding flow with SendGrid
- **CI/CD** — GitHub Actions pipeline for lint + test + Docker build
- **AWS deployment** — ECS Fargate + DocumentDB (MongoDB-compatible) + CloudFront

---

## 7. What was the hardest part and how did you solve it?

**The SSE run-progress stream + circular import between run_service and orchestrator.**

Two intertwined problems surfaced simultaneously.

**Problem 1 — Circular import:**
`run_service` needed to call `orchestrator.run_for_product()` to start the pipeline,
but the orchestrator originally imported `run_service` to push SSE events. Python
resolves circular imports at module load time and raises `ImportError`.

**Solution:** Made the import deferred — inside the `_execute_run()` function body
(`from app.agents.orchestrator import run_for_product`). The orchestrator no longer
imports `run_service` at all; instead `run_service._execute_run()` passes the progress
queue directly so the orchestrator can push events without a back-reference.

**Problem 2 — SSE race condition:**
If the background task started before the stream subscriber connected, early
`queue.put()` calls would land in a queue nobody was reading, and those events
would be silently dropped.

**Solution:** The queue is created and registered in `_run_queues[run_id]` *before*
`asyncio.create_task()` is called. That way any subscriber that connects immediately
after trigger will get all events from the start. A 25-second `asyncio.wait_for()`
keepalive prevents the SSE connection from timing out between products.

---

## 8. Cost constraints

All APIs used are on free tiers:
- Groq API — free tier, 30 requests/min for `llama-3.3-70b-versatile`
- MongoDB — local Docker instance (no Atlas cost)

Rate limit handling: The orchestrator processes products sequentially with a small
delay between agent calls to stay within Groq's free tier limits.
