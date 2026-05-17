# Architecture Document
## Klypup — Dynamic Pricing Intelligence Dashboard

---

## 1. System Architecture Diagram

> High-level view of all components and how they connect.

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│              React SPA (Vite, port 5173)                │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / REST + SSE
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   FastAPI Backend                        │
│                    (port 8000)                          │
│                                                         │
│  routes/ → controllers/ → services/                     │
│                    │                                    │
│            agents/orchestrator                          │
│     ┌──────┬──────┬──────┬──────┐                      │
│     │ Mkt  │ Dem  │ Inv  │ Prc  │ Exec                 │
│     │ Intel│ Fcst │ Cost │ Stgy │ Comp                 │
│     └──┬───┴──┬───┴──┬───┴──┬───┴──┬──┘                │
│        │      │      │      │      │                    │
│        └──────┴──────┴──────┴──────┘                    │
│                    │  tool use                          │
│              tools/ (Python fns)                        │
└────────────┬────────────────────────────────────────────┘
             │
      ┌──────┴──────┐         ┌─────────────────┐
      │   MongoDB   │         │   Groq API       │
      │  (port 27017)│        │  llama-3.3-70b   │
      └─────────────┘         └─────────────────┘
```

**Boundaries:**
- Frontend never calls Groq directly — all AI goes through the backend
- `tools/` are Python functions, not HTTP services — agents call them in-process
- MongoDB holds all persistent state; Groq is stateless per-call

---

## 2. Data Flow Diagram

> Trace one full user action end-to-end.

### 2a. Triggering a Pricing Run

```
Analyst clicks "Run Pricing"
  │
  ▼
POST /api/v1/runs
  │
  ├─ routes/runs.py           — matches URL, calls controller
  ├─ controllers/run_controller.py  — extracts body, calls service
  ├─ dependencies.py          — get_current_user() → validates JWT → user.org_id
  │
  ▼
services/run_service.trigger_run(org_id, product_filter)
  │
  ├─ creates PricingRun doc (status=running) in MongoDB
  ├─ spawns FastAPI BackgroundTask
  │
  ▼  (background)
agents/orchestrator.run_for_product(product_id, org_id, run_id)
  │
  ├─ [1] MarketIntelligenceAgent.run()
  │       → Groq API call with tools [get_competitor_prices]
  │       → tool call executed locally in tools/competitor_data.py
  │       → returns: {price_position, competitive_gap_pct, narrative}
  │
  ├─ [2] DemandForecastingAgent.run(context=agent1_output)
  │       → Groq API call with tools [get_demand_signals]
  │       → returns: {demand_score, elasticity, trend_direction, narrative}
  │
  ├─ [3] InventoryCostAgent.run(context=agent1+2_output)
  │       → Groq API call with tools [get_inventory_levels]
  │       → returns: {margin_headroom, inventory_pressure, narrative}
  │
  ├─ [4] PricingStrategyAgent.run(context=agent1+2+3_output)
  │       → Groq API call with tools [get_org_config]
  │       → returns: {recommended_price, confidence_score, strategy_label, narrative}
  │
  ├─ [5] ExecutionComplianceAgent.run(context=all_above)
  │       → Groq API call with tools [check_price_bounds, check_margin_floor]
  │       → returns: {final_price, compliance_flags, approval_routing}
  │
  ├─ saves PricingRecommendation doc with all 5 agent outputs embedded
  ├─ routes status: auto_approved | pending | rejected | escalated
  │
  └─ if auto_approved → tools/ecommerce_api.apply_price_change()
                      → creates AuditLog entry
```

### 2b. Analyst Approves a Recommendation

```
Analyst clicks "Approve"
  │
  ▼
POST /api/v1/recommendations/{id}/approve
  │
  ├─ JWT validated → user extracted (analyst role confirmed)
  ├─ recommendation_service.approve(rec_id, org_id, user_id, note)
  │       → verifies rec belongs to user's org (tenant isolation)
  │       → updates recommendation.status = "approved"
  │       → calls ecommerce_api.apply_price_change()
  │       → calls audit_service.log(action="price_updated", ...)
  │
  └─ returns updated recommendation
```

---

## 3. Database Schema (MongoDB Collections)

### organizations
```
{
  _id:        ObjectId,
  name:       string,
  slug:       string,        // unique, URL-safe
  is_active:  boolean,
  created_at: datetime
}
```

### users
```
{
  _id:           ObjectId,
  org_id:        ObjectId,   // → organizations._id
  email:         string,
  password_hash: string,
  full_name:     string,
  role:          "admin" | "pricing_analyst",
  is_active:     boolean,
  created_at:    datetime,
  last_login_at: datetime | null
}
Index: (org_id, email) unique
```

### org_configs
```
{
  _id:                    ObjectId,
  org_id:                 ObjectId,  // unique, one per org
  auto_apply_threshold:   float,     // e.g. 0.90 → 90% confidence = auto-execute
  human_review_threshold: float,     // e.g. 0.70 → needs analyst approval
  reject_below_threshold: float,     // e.g. 0.50 → auto-reject
  max_price_increase_pct: float,
  max_price_decrease_pct: float,
  global_margin_floor_pct: float,
  escalation_email:       string | null,
  require_dual_approval:  boolean,
  updated_at:             datetime,
  updated_by:             ObjectId | null
}
```

### products
```
{
  _id:            ObjectId,
  org_id:         ObjectId,
  sku:            string,
  name:           string,
  category:       string,
  brand:          string,
  current_price:  float,
  cost_basis:     float,     // COGS
  msrp:           float | null,
  min_price:      float,     // absolute floor
  max_price:      float | null,
  stock_quantity: integer,
  reorder_point:  integer,
  is_active:      boolean,
  created_at:     datetime,
  updated_at:     datetime
}
Index: (org_id, sku) unique
Index: (org_id, category)
```

### competitor_prices
```
{
  _id:             ObjectId,
  org_id:          ObjectId,
  product_id:      ObjectId,
  competitor_name: string,
  price:           float,
  in_stock:        boolean,
  scraped_at:      datetime
}
Index: (org_id, product_id, scraped_at DESC)
```

### demand_signals
```
{
  _id:              ObjectId,
  org_id:           ObjectId,
  product_id:       ObjectId,
  signal_type:      "search_volume" | "social_trend" | "seasonal" | "historical_sales",
  signal_value:     float,    // normalised 0–100
  trend_direction:  "up" | "down" | "flat",
  change_pct_7d:    float | null,
  change_pct_30d:   float | null,
  recorded_at:      datetime
}
```

### pricing_runs
```
{
  _id:                      ObjectId,
  org_id:                   ObjectId,
  triggered_by:             ObjectId | null,   // null = scheduled
  trigger_mode:             "manual" | "scheduled",
  status:                   "pending" | "running" | "completed" | "failed",
  total_products:           integer,
  products_processed:       integer,
  recommendations_generated: integer,
  started_at:               datetime,
  completed_at:             datetime | null,
  error_message:            string | null
}
```

### pricing_recommendations
```
{
  _id:                ObjectId,
  org_id:             ObjectId,
  run_id:             ObjectId,
  product_id:         ObjectId,
  current_price:      float,
  recommended_price:  float,
  price_change_pct:   float,       // signed, e.g. -0.05 = 5% drop
  confidence_score:   float,       // 0.0 – 1.0
  strategy_label:     string,      // e.g. "competitive_undercut"
  rationale_summary:  string,

  // ← Embedded: no separate collection needed, one fetch = full detail page
  agent_reasoning: [
    {
      agent_name:        string,
      input_context:     object,
      tool_calls: [
        { tool_name: string, arguments: object, result: object, execution_ms: int }
      ],
      output_signal:     object,
      narrative:         string,
      confidence_contrib: float | null,
      execution_ms:      int
    }
  ],

  status:             "pending" | "auto_approved" | "approved" | "rejected" | "escalated" | "applied",
  reviewed_by:        ObjectId | null,
  reviewed_at:        datetime | null,
  review_note:        string | null,
  applied_at:         datetime | null,
  created_at:         datetime
}
Index: (org_id, status, created_at DESC)
Index: (org_id, product_id, created_at DESC)
Index: (confidence_score DESC)
```

### audit_logs
```
{
  _id:               ObjectId,
  org_id:            ObjectId,
  product_id:        ObjectId,
  recommendation_id: ObjectId | null,
  actor_id:          ObjectId | null,   // null = system
  action:            "price_updated" | "recommendation_approved" | "recommendation_rejected"
                     | "recommendation_escalated" | "config_changed" | "run_triggered",
  old_value:         object,            // e.g. { price: 49.99 }
  new_value:         object,            // e.g. { price: 54.99 }
  metadata:          object,
  occurred_at:       datetime
}
Index: (org_id, occurred_at DESC)
Index: (org_id, product_id, occurred_at DESC)
```

---

## 4. AI Orchestration Flow

> How the LLM pipeline works — tool use loop detail.

```
For each product in the run:

  context = {}

  for each Agent in [Market, Demand, Inventory, Strategy, Compliance]:

    messages = [system_prompt, user_message_with_context]

    loop:
      response = groq.chat.completions.create(model, messages, tools)

      if response.finish_reason == "tool_calls":
        for each tool_call:
          result = execute_python_function(tool_call.name, tool_call.arguments)
          append tool_result to messages

      elif response.finish_reason == "stop":
        agent_output = parse_json(response.content)
        break

    store agent_output in context[agent_name]
    save AgentReasoning (embedded) in recommendation doc

  final = context["execution_compliance"]

  route_status(final.approval_routing, final.confidence_score, org_config)
    → "auto_approved"  if confidence >= auto_apply_threshold
    → "pending"        if confidence >= human_review_threshold
    → "escalated"      if compliance_override == true
    → "rejected"       if confidence < reject_below_threshold
```

---

## 5. Multi-Tenant Data Flow

> How org isolation is enforced end-to-end.

```
HTTP Request  →  Bearer JWT token in Authorization header
                        │
                        ▼
            dependencies.get_current_user()
                        │
                        ├─ decode JWT → payload["sub"] = user_id
                        ├─ load User from MongoDB by user_id
                        └─ return user  (user.org_id = tenant)

                        │
                        ▼
            Controller receives current_user

                        │
                        ▼
            Service called with org_id=current_user.org_id

                        │
                        ▼
            Every MongoDB query:
            Product.find(Product.org_id == org_id, ...)

org_id is NEVER read from the request body or query params.
Org A's data is structurally unreachable by Org B.
```

---

## 6. API Endpoint Reference

| Method | Path | Auth | Role | Purpose |
|---|---|---|---|---|
| POST | `/api/v1/auth/signup` | None | — | Create account + org |
| POST | `/api/v1/auth/login` | None | — | Returns access + refresh tokens |
| POST | `/api/v1/auth/logout` | Bearer | Any | Clears refresh token |
| POST | `/api/v1/auth/refresh` | Refresh | Any | Issues new access token |
| GET | `/api/v1/auth/me` | Bearer | Any | Current user profile |
| GET | `/api/v1/users` | Bearer | Admin | List org users |
| POST | `/api/v1/users/invite` | Bearer | Admin | Create new user in org |
| PATCH | `/api/v1/users/{id}` | Bearer | Admin | Update role / deactivate |
| GET | `/api/v1/products` | Bearer | Any | Paginated product list with filters |
| POST | `/api/v1/products` | Bearer | Admin | Create product |
| GET | `/api/v1/products/{id}` | Bearer | Any | Product detail |
| PATCH | `/api/v1/products/{id}` | Bearer | Admin | Update product |
| DELETE | `/api/v1/products/{id}` | Bearer | Admin | Soft-delete product |
| GET | `/api/v1/products/{id}/history` | Bearer | Any | Price change history |
| POST | `/api/v1/runs` | Bearer | Any | Trigger pricing run |
| GET | `/api/v1/runs` | Bearer | Any | List runs for org |
| GET | `/api/v1/runs/{id}` | Bearer | Any | Run detail + progress |
| GET | `/api/v1/runs/{id}/stream` | Bearer | Any | SSE live progress |
| GET | `/api/v1/recommendations` | Bearer | Any | List with filters (status, confidence) |
| GET | `/api/v1/recommendations/{id}` | Bearer | Any | Full detail + all agent reasoning |
| POST | `/api/v1/recommendations/{id}/approve` | Bearer | Analyst+ | Approve recommendation |
| POST | `/api/v1/recommendations/{id}/reject` | Bearer | Analyst+ | Reject with reason |
| POST | `/api/v1/recommendations/{id}/modify` | Bearer | Analyst+ | Override price + approve |
| GET | `/api/v1/audit` | Bearer | Any | Paginated audit log |
| GET | `/api/v1/audit/export` | Bearer | Admin | CSV export |
| GET | `/api/v1/config` | Bearer | Admin | Current org config |
| PUT | `/api/v1/config` | Bearer | Admin | Update thresholds + rules |
| POST | `/api/v1/config/reset` | Bearer | Admin | Reset to defaults |
| GET | `/api/v1/dashboard/kpis` | Bearer | Any | Aggregate KPI counts |
| GET | `/api/v1/dashboard/activity` | Bearer | Any | Recent activity feed |
