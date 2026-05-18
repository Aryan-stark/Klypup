# DECISIONS.md
## Klypup — Dynamic Pricing Intelligence Dashboard

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
| Database | MongoDB + Beanie | PostgreSQL + SQLAlchemy | Agent reasoning embeds naturally in a single document; no joins needed for the detail page |
| AI — primary | Cerebras (`llama-3.3-70b`) | OpenAI GPT-4o, Claude Sonnet | Free tier; fastest inference (~500 tok/s); OpenAI-compatible tool-use API |
| AI — fallback chain | Gemini → Groq | Single-provider | If Cerebras is unavailable, Gemini is tried next, then Groq — zero manual intervention |
| Frontend | React + Vite | Next.js, Vue | Pure SPA is sufficient for a dashboard; Vite HMR is faster than CRA |
| Styling | Tailwind CSS + shadcn/ui | MUI, Chakra | Utility-first CSS with accessible pre-built components; no runtime CSS-in-JS |
| Animations | framer-motion | CSS transitions, GSAP | Declarative spring physics with `AnimatePresence` — minimal code for the agent pipeline modal |
| Auth | JWT (access + refresh) | Supabase Auth, Auth0 | Full control, no third-party dependency, `org_id` + `role` baked into every token claim |
| Caching | In-memory TTL cache | Redis | Zero additional infrastructure for the assessment; same interface if swapping to Redis later |
| Rate limiting | Custom sliding-window middleware | slowapi, limits | No extra dependency; SSE endpoints need custom exemption logic that third-party libs don't expose cleanly |

---

## 3. How did you approach multi-tenancy?

**Pattern: `org_id` field on every document + dependency-layer enforcement**

Every MongoDB document has an `org_id` field. `get_current_user()` in `dependencies.py`
extracts `org_id` from the JWT — it is never read from the request body or query
parameters. Every service function receives `org_id` as a required positional argument.
Every MongoDB query filters by `org_id`.

This makes cross-tenant access structurally impossible from a correctly implemented
endpoint — no developer can accidentally forget to filter because `org_id` must be
explicitly passed to every service function. Forgetting it is a compile-time-style
error (missing required argument) not a silent data leak.

**Test it yourself:** log in as `admin@acme.com` in one browser and `admin@globex.com`
in another (private window). Products, recommendations, audit logs, and config are
completely isolated — neither org can see the other's data even through direct API calls
with valid tokens.

---

## 4. How did you design the AI integration?

**Sequential pipeline with tool use per agent, multi-provider fallback, and TTL caching**

Each of the 5 agents is a separate LLM API call with:
- A distinct system prompt defining its specific responsibility
- A small set of Python tool functions it can call via the OpenAI-compatible tool-use API
- The accumulated context from all upstream agents passed in as user-turn content

**Key decisions:**

**Sequential not parallel** — downstream agents need to reason about disagreements
between upstream signals. PricingStrategyAgent explicitly weighs "demand is rising
but inventory is critically low — raise or hold?" This nuance is lost with parallel
fan-out where each agent works in isolation.

**Tool use not pre-loaded context** — agents fetch exactly the data they need via
tool calls. This keeps prompts short, produces a visible call trace that is stored in
the DB, and displayed in the UI as an expandable accordion per agent.

**Status routing in Python not in AI** — the orchestrator applies the org's confidence
thresholds with exact float comparisons. Business routing logic must be deterministic
and auditable, not probabilistic. A human must be able to read the code and verify
exactly what rule fired.

**Multi-provider fallback** — `base_agent.py` tries Cerebras first (fastest), then
Gemini, then Groq. Each provider uses the same OpenAI-compatible client interface, so
the fallback is a one-line swap of the base URL and key. If all providers fail, the run
marks the product as errored and continues to the next product.

**Confidence coercion** — small models sometimes return `confidence_score` as a string
(`"0.78"`) or omit it entirely. The orchestrator wraps the extraction in a try/except:
`float(strategy.get("confidence_score") or 0.5)`. The default of 0.5 routes to human
review, which is the safe fallback for uncertainty.

**TTL caching on tool calls** — competitor prices, demand signals, and inventory data
are cached in a module-level `TTLCache` singleton (5–60 min TTL per resource type).
Within a single pricing run, agents 1–3 each call different tools, but the compliance
checks in agent 5 that re-fetch the same product doc hit the cache instead of MongoDB.
This is especially valuable when running against many SKUs.

---

## 5. What trade-offs did you make given the timeline?

| Trade-off | What was cut | What was kept | Why |
|---|---|---|---|
| Real scrapers | Live competitor price scraping | Mock data with realistic variance | Scraping is a separate project; mock is sufficient to demo the pipeline |
| Redis pub/sub | Multi-instance SSE | In-memory `asyncio.Queue` | Single container is fine for the assessment; Redis is a one-line swap |
| Redis cache | Persistent TTL cache | In-memory TTL cache | Same interface; cache resets on restart but that is acceptable for demo use |
| Email invites | Sending invitation emails | Credentials shown in UI | SMTP setup adds ops complexity with no demo value |
| Real Google Trends | Live demand signals | Mock seasonal index by category/month | Free tier rate limits would disrupt the demo |
| Unit tests | Full test suite | Manual smoke testing of each agent | Time went to core feature correctness and UX polish |
| SMTP | Email-based password reset | N/A | Out of scope for the assessment |

---

## 6. What would you improve with 2 more weeks?

**AI / Pipeline**
- Live competitor data via ScraperAPI or Apify instead of mock data
- Real demand signals via PyTrends (Google Trends) and/or sales history
- Prompt evaluation harness — score agent outputs against a labeled dataset and tune prompts to reduce `confidence_score` omissions
- Parallel fan-out for agents 1–3 (they don't depend on each other) then merge before agent 4

**Infrastructure**
- Redis pub/sub to replace in-memory SSE queues — required for multi-instance horizontal scaling
- Redis for TTL cache — survives container restarts, shared across instances
- GitHub Actions CI pipeline: lint (ruff, tsc), unit tests, Docker build check

**Auth / Users**
- Email-based org invitations via SendGrid instead of showing credentials in the UI
- Password reset flow
- OAuth (Google / GitHub) for signup

**Deployment**
- AWS ECS Fargate + DocumentDB (MongoDB-compatible) + CloudFront CDN
- Secrets in AWS Secrets Manager instead of `.env`

---

## 7. What was the hardest part and how did you solve it?

Three distinct problems surfaced during development, each requiring a different class of fix.

---

### 7a. SSE race condition + circular import

**Circular import:** `run_service` needed to call `orchestrator.run_for_product()` but
the orchestrator originally imported `run_service` to push SSE events. Python resolves
circular imports at module load time and raises `ImportError`.

**Solution:** The orchestrator no longer imports `run_service`. Instead,
`run_service._execute_run()` passes the progress queue directly as a function argument.
The orchestrator calls `queue.put()` without any back-reference to `run_service`. The
import inside the function body (`from app.agents.orchestrator import run_for_product`)
is deferred to call time, which Python resolves lazily without the circular error.

**SSE race condition:** If the background task started before the stream subscriber
connected, early `queue.put()` calls would land in a queue nobody was reading and be
silently dropped.

**Solution:** The queue is created and registered in `_run_queues[run_id]` *before*
`asyncio.create_task()` is called. Any subscriber that connects immediately after
the trigger receives all events from the beginning. A 25-second `asyncio.wait_for()`
keepalive prevents the SSE connection from timing out between products.

---

### 7b. AI output `KeyError: 'confidence_score'`

**Problem:** The pricing strategy agent occasionally returned a JSON blob without the
`confidence_score` field — either omitted entirely or returned as a string (`"0.78"`
instead of `0.78`). `orchestrator.py` did a direct dict access `strategy["confidence_score"]`
which raised `KeyError` after all 5 agents had already completed successfully, crashing
the entire run.

**Solution (layered):**

1. **Prompt hardening** — added an explicit example output block to the system prompt:
   `"confidence_score": 0.78  ← REQUIRED, never omit this field`

2. **Nudge-retry cap** — `base_agent.py` already nudged the model when it returned
   non-JSON. Added `_MAX_NUDGES = 2` to prevent an infinite loop; after the cap the
   agent returns `{}` and the orchestrator's `.get()` fallbacks handle the empty dict.

3. **Defensive extraction in orchestrator** — replaced the direct key access with:
   ```python
   try:
       confidence = float(strategy.get("confidence_score") or 0.5)
   except (TypeError, ValueError):
       confidence = 0.5
   ```
   The default of `0.5` routes to human review — the safest fallback when the AI's
   confidence is unknown.

---

### 7c. SSE modal UX — closing the modal lost the run

**Problem:** The "Run Pricing" button opened a modal with a live SSE progress feed.
When users closed the modal, the `RunAgentPlan` component unmounted, its `useEffect`
cleanup ran, and the `EventSource` connection closed. Reopening the modal had no run
state to reconnect to — the user had to trigger a new run.

**Solution:** Separated two conceptually different actions:
- `onClose` — hides the modal (sets `isOpen=false`), but keeps the component mounted.
  A floating mini-pill renders instead, showing the current agent and a "Resume" button.
  The SSE `useEffect` runs for the component's lifetime, not the modal's visibility.
- `onDone` — called when the run completes. This unmounts the component and clears state.

The invariant: `RunAgentPlan` is mounted if and only if there is an active run ID.
Visibility (`isOpen`) and existence are now independent.

---

## 8. Cost and rate-limit strategy

All APIs used are on free tiers:

| Provider | Limit | Handling |
|---|---|---|
| Cerebras | Free tier | Primary; fastest inference (~500 tok/s) |
| Gemini | Free tier | First fallback if Cerebras unavailable |
| Groq | 30 req/min on `llama-3.3-70b-versatile` | Second fallback |
| MongoDB | Local Docker | No Atlas cost |

**Rate limit handling:**
- The multi-provider fallback means a Cerebras hiccup doesn't fail the run
- Products are processed sequentially within a run (not fan-out) to stay within per-minute limits
- Frontend rate limiting (sliding window middleware): 10/min on auth endpoints, 5/min on run triggers, 200/min general — protects the backend from abuse without needing an external API gateway
