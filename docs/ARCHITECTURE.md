# Architecture Document
## Klypup — Dynamic Pricing Intelligence Dashboard

---

## 1. System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                          Browser                                 │
│                  React SPA  (Vite, port 5173)                    │
│                                                                  │
│  pages/  →  hooks/ (React Query)  →  services/ (Axios)          │
│  framer-motion animations   ·   Tailwind + shadcn/ui             │
│  Dark/light mode  ·  JWT stored in Zustand + localStorage        │
└─────────────────────────────┬────────────────────────────────────┘
                              │  HTTPS  REST + SSE
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       FastAPI Backend  (port 8000)               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Middleware stack  (innermost → outermost)               │   │
│  │   1. RateLimitMiddleware  — sliding window per IP        │   │
│  │   2. log_requests         — tenant + latency logging     │   │
│  │   3. CORSMiddleware       — origin allow-list            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  routes/ → controllers/ → services/                              │
│                   │                                              │
│           dependencies.py                                        │
│         get_current_user()  ←── JWT decode → org_id             │
│                   │                                              │
│           agents/orchestrator                                    │
│    ┌───────┬───────┬────────┬────────┬──────────┐               │
│    │Market │Demand │Invent- │Pricing │Execution │               │
│    │Intel  │Fcst   │ory Cost│Strategy│Compliance│               │
│    └───┬───┴───┬───┴────┬───┴────┬───┴────┬─────┘               │
│        │       │        │        │        │  tool use calls      │
│        └───────┴────────┴────────┴────────┘                      │
│                         │                                        │
│               tools/  (Python functions)                         │
│                         │                                        │
│             ┌───────────┴───────────┐                            │
│             │   TTL In-Memory Cache │  ← utils/cache.py          │
│             │   (5 – 60 min TTLs)   │                            │
│             └───────────┬───────────┘                            │
└─────────────────────────┼────────────────────────────────────────┘
                          │
          ┌───────────────┴────────────────┐
          │                                │
   ┌──────┴──────┐              ┌──────────┴────────────┐
   │   MongoDB   │              │  AI Provider  (one of) │
   │  port 27017 │              │  ① Cerebras  llama3.1  │
   │             │              │  ② Google Gemini 2.5   │
   │  8 collections             │  ③ Groq llama-3.3-70b  │
   └─────────────┘              └───────────────────────┘
```

**Boundaries:**
- The frontend never calls any AI provider directly — all inference goes through the backend
- `tools/` are plain Python functions called in-process; they are not HTTP services
- The TTL cache sits between the tool functions and MongoDB — tools check cache first
- MongoDB holds all persistent state; AI providers are stateless per API call
- Rate limiting runs before auth — unauthenticated abuse is blocked at the outermost layer

---

## 2. Data Flow Diagram

### 2a. Triggering a Pricing Run (full end-to-end trace)

```
User clicks "Run Pricing" in the browser
  │
  ▼
POST /api/v1/runs  (Authorization: Bearer <JWT>)
  │
  ├─ RateLimitMiddleware          5 req/60s per IP — blocks if exceeded → 429
  ├─ log_requests                 logs org_id, method, path, latency
  ├─ CORSMiddleware               validates Origin header
  │
  ├─ routes/runs.py               matches URL, delegates to controller
  ├─ controllers/run_controller   extracts body, calls service
  ├─ dependencies.get_current_user()
  │       decode JWT → payload["sub"] = user_id
  │       User.get(user_id) → user.org_id  ← tenant is set here
  │
  ▼
services/run_service.trigger_run(org_id, product_filter)
  │
  ├─ PricingRun.insert(status="running")  → MongoDB
  ├─ asyncio SSE queue registered at _run_queues[run_id]
  ├─ FastAPI BackgroundTask spawned       → non-blocking response returns immediately
  │
  ▼  (background task, concurrent with SSE stream)
orchestrator.run_for_product(product_id, org_id, run_id, org_config)
  │
  │  context = { "org_id": str(org_id) }
  │
  ├─ [1] MarketIntelligenceAgent.run()
  │       system_prompt + user_message(product_id, context)
  │       → AI API call  (finish_reason = tool_calls)
  │           tool: get_competitor_prices(product_id, days=7)
  │               cache check → miss → CompetitorPrice.find(...) → MongoDB
  │               cache.set("competitor:id:7", result, ttl=600)
  │           tool: get_product_details(product_id)
  │               cache check → miss → Product.get(id) → MongoDB
  │               cache.set("product:id", result, ttl=300)
  │       → AI API call  (finish_reason = stop)
  │           parse_json(response) → {price_position, competitive_gap_pct, narrative}
  │       context["market_intelligence"] = output
  │
  ├─ [2] DemandForecastingAgent.run(context)
  │       → tool: get_demand_signals(product_id)
  │           cache check → miss → DemandSignal.find(...) → MongoDB
  │       → tool: get_seasonal_index(category)
  │           cache check → miss → static table lookup
  │           cache.set("seasonal:electronics:5", result, ttl=3600)
  │       → output: {demand_score, elasticity, trend_direction, narrative}
  │       context["demand_forecasting"] = output
  │
  ├─ [3] InventoryCostAgent.run(context)
  │       → tool: get_inventory_levels(product_id)
  │           cache check → HIT (product doc already cached by agent 1)
  │       → tool: get_org_margin_floor(org_id)
  │           cache check → miss → OrgConfig.find_one(org_id) → MongoDB
  │       → output: {margin_headroom, inventory_pressure, narrative}
  │       context["inventory_cost"] = output
  │
  ├─ [4] PricingStrategyAgent.run(context)
  │       → tool: get_org_config(org_id)
  │           cache check → HIT (org config cached by agent 3)
  │       → output: {recommended_price, confidence_score, strategy_label, narrative}
  │       context["pricing_strategy"] = output
  │
  ├─ [5] ExecutionComplianceAgent.run(context)
  │       → tool: check_price_bounds(product_id, recommended_price)
  │           _get_product() → cache HIT
  │       → tool: check_margin_floor(product_id, org_id, price)
  │           _get_product() → cache HIT  |  _get_org_config() → cache HIT
  │       → tool: check_rate_of_change(product_id, org_id, price)
  │           both → cache HIT
  │       → output: {final_recommended_price, compliance_flags, approval_routing}
  │
  ├─ orchestrator._save_and_route()
  │       confidence = float(strategy.get("confidence_score") or 0.5)
  │       status = _route_status(confidence, compliance_override, org_config)
  │           ≥ auto_apply_threshold (0.90) → "auto_approved"
  │           ≥ human_review_threshold (0.70) → "pending"
  │           compliance_override == true → "escalated"
  │           else → "rejected"
  │
  │       PricingRecommendation.insert()  ← 5 agent outputs embedded in one document
  │
  │       if auto_approved:
  │           ecommerce_api.apply_price_change(product_id, final_price)
  │           AuditLog.insert(action="price_updated")
  │
  └─ run_service.push_event("progress", products_processed=N)
         → SSE queue → browser EventSource receives event
         → RunAgentPlan UI snaps all agents to "completed"
         → resets for next product after 2.5s delay

  When all products done:
  push_event("completed")  →  browser shows "View Recommendations" button
```

### 2b. Analyst Approves a Recommendation

```
Analyst clicks "Approve" on a recommendation card
  │
  ▼
POST /api/v1/recommendations/{id}/approve  (Bearer JWT)
  │
  ├─ middleware stack (rate limit → log → CORS)
  ├─ get_current_user() → user.org_id = Acme Corp's org_id
  │
  ▼
recommendation_service.approve(rec_id, org_id, user_id, note)
  │
  ├─ rec = PricingRecommendation.get(rec_id)
  ├─ assert rec.org_id == org_id   ← tenant check — prevents cross-org access
  ├─ rec.status = "approved"
  ├─ rec.reviewed_by = user_id
  ├─ rec.review_note = note
  ├─ rec.save()
  │
  ├─ ecommerce_api.apply_price_change(product_id, recommended_price)
  │       (mock platform API — updates product.current_price in MongoDB)
  │
  └─ audit_service.log(action="recommendation_approved", ...)
         AuditLog.insert(org_id, product_id, actor_id, old_value, new_value)
         → returned in audit trail, exported in CSV

  Response: { ok: true, data: <updated recommendation> }
  React Query invalidates ["recommendations"] cache → UI refreshes
```

---

## 3. Database Schema

### Collections overview

```
organizations ──┐
                ├── users (org_id FK)
                ├── org_configs (org_id FK, 1:1)
                ├── products (org_id FK)
                │     ├── competitor_prices (product_id FK)
                │     └── demand_signals (product_id FK)
                ├── pricing_runs (org_id FK)
                │     └── pricing_recommendations (run_id FK, product_id FK)
                │             └── agent_reasoning[] (embedded array)
                └── audit_logs (org_id FK, product_id FK)
```

### organizations
```
{
  _id:        ObjectId,
  name:       string,          // "Acme Corp"
  slug:       string,          // "acme-corp" — unique, URL-safe
  is_active:  boolean,
  created_at: datetime
}
Index: slug (unique)
```

### users
```
{
  _id:                ObjectId,
  org_id:             ObjectId → organizations._id,
  email:              string,   // globally unique across all orgs
  password_hash:      string,   // bcrypt
  full_name:          string,
  role:               "admin" | "pricing_analyst",
  is_active:          boolean,
  refresh_token_hash: string | null,  // bcrypt — cleared on logout
  created_at:         datetime,
  last_login_at:      datetime | null
}
Index: email (unique, global)
Index: (org_id, email) (unique, per-tenant)
```

### org_configs
```
{
  _id:                     ObjectId,
  org_id:                  ObjectId → organizations._id  (unique),
  auto_apply_threshold:    float,    // default 0.90 — auto-execute above this
  human_review_threshold:  float,    // default 0.70 — queue for analyst review
  reject_below_threshold:  float,    // default 0.50 — auto-reject below this
  max_price_increase_pct:  float,    // default 0.20 — hard cap per run
  max_price_decrease_pct:  float,    // default 0.15
  global_margin_floor_pct: float,    // default 0.15 — min gross margin
  escalation_email:        string | null,
  require_dual_approval:   boolean,
  updated_at:              datetime,
  updated_by:              ObjectId | null
}
Index: org_id (unique)
```

### products
```
{
  _id:            ObjectId,
  org_id:         ObjectId → organizations._id,
  sku:            string,
  name:           string,
  category:       string,
  subcategory:    string,
  brand:          string,
  current_price:  float,
  cost_basis:     float,      // COGS
  msrp:           float | null,
  min_price:      float,      // absolute price floor
  max_price:      float | null,
  stock_quantity: integer,
  reorder_point:  integer,
  tags:           string[],
  is_active:      boolean,
  created_at:     datetime,
  updated_at:     datetime
}
Index: (org_id, sku) unique
Index: (org_id, category)
Index: (org_id, is_active, current_price)
```

### competitor_prices
```
{
  _id:             ObjectId,
  org_id:          ObjectId,
  product_id:      ObjectId → products._id,
  competitor_name: string,
  price:           float,
  currency:        string,    // "USD"
  in_stock:        boolean,
  scraped_at:      datetime
}
Index: (org_id, product_id, scraped_at DESC)
```

### demand_signals
```
{
  _id:             ObjectId,
  org_id:          ObjectId,
  product_id:      ObjectId → products._id,
  signal_type:     "search_volume" | "social_trend" | "seasonal" | "historical_sales",
  signal_value:    float,     // normalised 0–100
  trend_direction: "up" | "down" | "flat",
  change_pct_7d:   float | null,
  change_pct_30d:  float | null,
  source:          string,
  recorded_at:     datetime
}
Index: (org_id, product_id, recorded_at DESC)
```

### pricing_runs
```
{
  _id:                       ObjectId,
  org_id:                    ObjectId,
  triggered_by:              ObjectId | null,   // user_id; null = scheduled
  trigger_mode:              "manual" | "scheduled",
  status:                    "pending" | "running" | "completed" | "failed",
  total_products:            integer,
  products_processed:        integer,
  recommendations_generated: integer,
  started_at:                datetime,
  completed_at:              datetime | null,
  error_message:             string | null
}
Index: (org_id, started_at DESC)
```

### pricing_recommendations
```
{
  _id:               ObjectId,
  org_id:            ObjectId,
  run_id:            ObjectId → pricing_runs._id,
  product_id:        ObjectId → products._id,
  current_price:     float,
  recommended_price: float,
  price_change_pct:  float,       // signed — e.g. -0.05 = 5% drop
  confidence_score:  float,       // 0.0–1.0
  strategy_label:    string,      // "competitive_undercut" | "competitive_parity" | ...
  rationale_summary: string,

  agent_reasoning: [              // embedded — one fetch = full detail page
    {
      agent_name:    string,      // "MarketIntelligenceAgent" etc.
      input_context: object,      // upstream context passed in
      tool_calls: [
        {
          tool_name:    string,
          arguments:    object,
          result:       object,
          execution_ms: integer
        }
      ],
      output_signal:  object,     // structured output fields
      narrative:      string,     // model's natural-language explanation
      execution_ms:   integer
    }
  ],

  status:      "pending" | "auto_approved" | "approved" | "rejected" | "escalated",
  reviewed_by: ObjectId | null,
  reviewed_at: datetime | null,
  review_note: string | null,
  applied_at:  datetime | null,
  created_at:  datetime
}
Index: (org_id, status, created_at DESC)    — recommendation queue
Index: (org_id, product_id, created_at DESC) — product history
Index: (org_id, confidence_score DESC)       — confidence chart aggregation
```

### audit_logs
```
{
  _id:               ObjectId,
  org_id:            ObjectId,
  product_id:        ObjectId,
  recommendation_id: ObjectId | null,
  actor_id:          ObjectId | null,  // null = automated system
  action:            "price_updated" | "recommendation_approved" |
                     "recommendation_rejected" | "recommendation_escalated" |
                     "config_changed" | "run_triggered",
  old_value:         object,           // e.g. { price: 49.99 }
  new_value:         object,           // e.g. { price: 54.99 }
  metadata:          object,
  occurred_at:       datetime
}
Index: (org_id, occurred_at DESC)
Index: (org_id, product_id, occurred_at DESC)
```

---

## 4. AI Orchestration Flow

### 4a. Single Agent Tool-Use Loop (BaseAgent)

```
agent.run(product_id, context)
  │
  messages = [system_prompt, user_message(product_id, context)]
  nudge_count = 0
  │
  loop:
    response = AI_API.chat.completions.create(model, messages, tools)

    if finish_reason == "tool_calls":
      for each tool_call in response:
        args = json.loads(tool_call.function.arguments)
        result = execute_python_function(tool_call.name, args)
        append tool_result to messages
      continue loop

    elif finish_reason == "stop":
      output = parse_json(response.content)

      if output is None:                      // model returned prose not JSON
        if nudge_count >= 2:
          output = {}                         // give up — safe empty dict
        else:
          nudge_count += 1
          append assistant message + nudge user message
          continue loop                       // ask model to retry

      output["_tool_calls"] = trace
      output["_execution_ms"] = elapsed
      return output
```

**JSON parsing — 3-stage fallback:**
1. Strip markdown code fences, try `json.loads()` directly
2. If that fails, iterative `JSONDecoder.raw_decode()` — scans for every valid JSON object, returns the **last** one (model sometimes echoes the tool call JSON before its own output)
3. If all fail → nudge-retry (max 2 attempts), then return empty dict

**API rate limit handling:**
- Catches `429` / `RESOURCE_EXHAUSTED`
- Extracts `retryDelay` from error body via regex
- Waits `delay + 5s`, retries up to 3 times (`_MAX_RETRIES`)

### 4b. Five-Agent Sequential Pipeline

```
context = { "org_id": str(org_id) }

  ┌─────────────────────────────────────────────────────────────┐
  │  [1] MarketIntelligenceAgent                                │
  │      tools: get_competitor_prices, get_product_details      │
  │      reads: CompetitorPrice collection, Product doc         │
  │      output: price_position, competitive_gap_pct, narrative │
  └─────────────────────────┬───────────────────────────────────┘
                            │  context["market_intelligence"] = output
                            ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  [2] DemandForecastingAgent                                 │
  │      tools: get_demand_signals, get_seasonal_index          │
  │      reads: DemandSignal collection, static seasonal table  │
  │      output: demand_score, elasticity, trend_direction      │
  └─────────────────────────┬───────────────────────────────────┘
                            │  context["demand_forecasting"] = output
                            ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  [3] InventoryCostAgent                                     │
  │      tools: get_inventory_levels, get_org_margin_floor      │
  │      reads: Product doc (cache HIT), OrgConfig              │
  │      output: margin_headroom, inventory_pressure            │
  └─────────────────────────┬───────────────────────────────────┘
                            │  context["inventory_cost"] = output
                            ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  [4] PricingStrategyAgent   ← central synthesiser           │
  │      tools: get_org_config                                  │
  │      reads: OrgConfig (cache HIT)                           │
  │      receives: all 3 upstream outputs in context            │
  │      output: recommended_price, confidence_score (0–1),     │
  │              strategy_label, risk_factors, narrative        │
  └─────────────────────────┬───────────────────────────────────┘
                            │  context["pricing_strategy"] = output
                            ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  [5] ExecutionComplianceAgent                               │
  │      tools: check_price_bounds, check_margin_floor,         │
  │             check_rate_of_change                            │
  │      reads: Product doc (cache HIT), OrgConfig (cache HIT)  │
  │      output: final_recommended_price, compliance_flags,     │
  │              compliance_override, approval_routing           │
  └─────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
  orchestrator._save_and_route()
    confidence = float(strategy.get("confidence_score") or 0.5)

    status routing (pure Python — deterministic, auditable):
      compliance_override == true  →  "escalated"
      confidence ≥ 0.90            →  "auto_approved"  → apply price immediately
      confidence ≥ 0.70            →  "pending"        → analyst queue
      else                         →  "rejected"

    PricingRecommendation.insert()   ← all 5 agent outputs embedded
```

**Why sequential, not parallel:**
Agents 4 and 5 must reason about disagreements between agents 1–3. A parallel fan-out cannot express "demand is rising but stock is critically low — should I discount or hold?" Sequential pipeline preserves that nuance.

**Why tool use, not pre-loaded context:**
Agents fetch only the data they need via tool calls. This keeps prompts short, produces a visible call trace stored in MongoDB, and is displayed in the recommendation detail UI.

**Why status routing in Python:**
Business rules (thresholds, compliance) must be deterministic and auditable. The same inputs must always produce the same routing decision. AI probability cannot guarantee this.

### 4c. TTL Cache Layer

```
Tool function call  →  cache.get("competitor:id:7")
                            │
                    ┌───────┴──────────┐
                    │   cache hit?      │
                    └───────┬──────────┘
                 Yes ◄──────┤►──── No
                  │                    │
              return                MongoDB query
              cached value            │
                                  cache.set(key, result, ttl)
                                      │
                                  return result

TTLs:
  product details      300s  (5 min)
  inventory levels     300s  (5 min)
  org config           300s  (5 min)
  org margin floor     300s  (5 min)
  competitor prices    600s  (10 min)
  demand signals       600s  (10 min)
  seasonal index     3,600s  (60 min)

Within a single product run, agents 3, 4, and 5 all need the product doc
and org config. Without caching: 6+ DB reads per product.
With caching: 1 DB read per resource, rest are in-memory lookups.
```

---

## 5. Multi-Tenant Data Flow

```
HTTP Request  →  Authorization: Bearer <JWT>
                          │
                          ▼
              RateLimitMiddleware
              (blocks before auth — no user lookup needed)
                          │
                          ▼
              dependencies.get_current_user()
                          │
                    decode JWT
                          │
                    payload = {
                      "sub":    "user_id",
                      "org_id": "acme_org_id",   ← extracted here
                      "role":   "admin",
                      "exp":    ...
                    }
                          │
                    User.get(payload["sub"])      ← verify user still exists & active
                          │
                    current_user.org_id = acme_org_id
                          │
                          ▼
              Controller  →  Service(org_id=current_user.org_id)
                                          │
                                          ▼
                          Every MongoDB query includes org_id filter:

                          Product.find(
                              Product.org_id == org_id,   ← tenant filter
                              Product.is_active == True,
                              ...
                          )

                          PricingRecommendation.find(
                              PricingRecommendation.org_id == org_id,
                              ...
                          )

Isolation guarantees:
  ✓  org_id is NEVER read from the request body or query params
  ✓  org_id is extracted from the JWT, which is signed with JWT_SECRET
  ✓  A valid token for Org A cannot claim Org B's org_id
  ✓  Every service function takes org_id as a required parameter —
     a developer cannot accidentally omit it
  ✓  Every DB query filters by org_id — the Beanie ODM enforces this
     at the query level, not the application level

Cross-org access test:
  Org A user requests recommendation ID belonging to Org B
    → rec = PricingRecommendation.get(id)
    → assert rec.org_id == org_id   ← fails → 404 returned
    → Org B's data is never included in the response
```

---

## 6. API Endpoint Reference

### Auth

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/auth/signup` | None | Create account + new org + OrgConfig |
| `POST` | `/api/v1/auth/login` | None | Returns access token + refresh token |
| `POST` | `/api/v1/auth/logout` | Bearer | Clears stored refresh token hash |
| `POST` | `/api/v1/auth/refresh` | Refresh token | Issues new access + refresh (rotation) |
| `GET` | `/api/v1/auth/me` | Bearer | Current user profile |

### Users (Admin only)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/users` | Bearer + Admin | List active users in org |
| `POST` | `/api/v1/users/invite` | Bearer + Admin | Create user (any role) within org |
| `PATCH` | `/api/v1/users/{id}` | Bearer + Admin | Update role / deactivate |

### Products

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/products` | Bearer | Paginated list — filter by category, status, search |
| `POST` | `/api/v1/products` | Bearer + Admin | Create product |
| `GET` | `/api/v1/products/{id}` | Bearer | Product detail + price history |
| `PATCH` | `/api/v1/products/{id}` | Bearer + Admin | Update product fields |
| `DELETE` | `/api/v1/products/{id}` | Bearer + Admin | Soft-delete (is_active = false) |

### Pricing Runs

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/runs` | Bearer | Trigger new pricing run (rate limited: 5/min) |
| `GET` | `/api/v1/runs` | Bearer | List runs for org |
| `GET` | `/api/v1/runs/{id}` | Bearer | Run detail + progress |
| `GET` | `/api/v1/runs/{id}/stream` | Bearer (query param token) | SSE live progress — exempt from rate limit |

### Recommendations

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/recommendations` | Bearer | List — filter by status, confidence, product |
| `GET` | `/api/v1/recommendations/{id}` | Bearer | Full detail + all 5 agent reasoning embedded |
| `POST` | `/api/v1/recommendations/{id}/approve` | Bearer | Approve — triggers price apply + audit log |
| `POST` | `/api/v1/recommendations/{id}/reject` | Bearer | Reject with reason |
| `POST` | `/api/v1/recommendations/{id}/modify` | Bearer | Override price and approve |

### Audit

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/audit` | Bearer | Paginated audit log with filters |
| `GET` | `/api/v1/audit/export` | Bearer + Admin | Full CSV export (JWT in header) |

### Config (Admin only)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/config` | Bearer + Admin | Current org thresholds + rules |
| `PUT` | `/api/v1/config` | Bearer + Admin | Update thresholds and caps |
| `POST` | `/api/v1/config/reset` | Bearer + Admin | Reset to safe defaults |

### Dashboard

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/dashboard/kpis` | Bearer | Aggregate KPIs + confidence distribution |
| `GET` | `/api/v1/dashboard/activity` | Bearer | Recent activity feed |

### Health

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | None | Container health check |

---

### Request / Response shape (common patterns)

**Paginated response:**
```json
{
  "ok": true,
  "data": [ ... ],
  "total": 520,
  "page": 1,
  "per_page": 20
}
```

**Single resource:**
```json
{ "ok": true, "data": { ... } }
```

**Error:**
```json
{ "ok": false, "error": "An account with this email already exists." }
```

**Rate limit exceeded (429):**
```json
{ "ok": false, "error": "Rate limit exceeded — max 5 requests per 60s for this endpoint." }
```
Headers: `Retry-After: 60`
