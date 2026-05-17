# Klypup — Dynamic Pricing Intelligence Dashboard
## Klypup Applied AI Intern Assessment — Option B

---

## What This Project Builds

A full-stack web application where an AI-powered multi-agent system monitors market
conditions, generates pricing recommendations with confidence scores, and routes them
through a human-in-the-loop approval workflow before executing price changes.

**The problem it solves:** E-commerce pricing teams spend 70%+ of their time gathering
data manually. This app automates that, giving analysts a queue of AI-generated
recommendations to review instead of a spreadsheet.

---

## Application Features (Assessment Requirements)

| Feature | Where it lives |
|---|---|
| Signup / Login / Logout (JWT) | `routes/auth.py` → `services/auth_service.py` |
| Role-based access (Admin + Pricing Analyst) | `dependencies.py` → `require_admin` / `require_analyst` |
| Organization isolation (multi-tenant) | `org_id` on every DB doc, extracted from JWT in `dependencies.py` |
| Product Catalog — filter, sort, search | `routes/products.py` → `services/product_service.py` |
| AI Pricing Engine — 5 agents | `agents/orchestrator.py` coordinates all 5 agents |
| Recommendation Detail — per-agent reasoning | embedded in `PricingRecommendation` document |
| Approval Workflow — approve / reject / modify | `routes/recommendations.py` → `services/recommendation_service.py` |
| Audit Trail — full history | `models/audit_log.py` → `routes/audit.py` |
| Admin Config Panel | `routes/config.py` → `services/config_service.py` |
| Mock competitor data | `tools/competitor_data.py` |
| Mock demand/trend signals | `tools/demand_signals.py` |
| Mock inventory & cost data | `tools/inventory_data.py` |
| Mock e-commerce platform API | `tools/ecommerce_api.py` |

---

## Tech Stack

| Layer | Technology | Why chosen |
|---|---|---|
| Frontend | React (Vite) + TypeScript | Fast SPA, no SSR needed for a dashboard app |
| Styling | Tailwind CSS + shadcn/ui | Utility-first CSS, pre-built accessible components |
| Backend | FastAPI (Python) | Async, great for AI pipelines, automatic `/docs` |
| Database | MongoDB + Beanie ODM | Flexible schema; agent reasoning embedded inside recommendation docs |
| AI / Agents | Groq API (`llama-3.3-70b-versatile`) | Fast inference, free tier, OpenAI-compatible tool use |
| Auth | JWT (access 15 min + refresh 7 days) | Stateless; `org_id` + `role` baked into token claims |
| Dev | Docker Compose | One-command local setup for mongo + backend + frontend |

---

## Project Structure

```
Klypup/
│
├── backend/                          # FastAPI Python application
│   └── app/
│       ├── main.py                   # Entry: registers all routers, starts DB connection
│       ├── config.py                 # All env vars via pydantic-settings (single source of truth)
│       ├── database.py               # MongoDB connection + Beanie initialization
│       ├── dependencies.py           # FastAPI Depends() — get_current_user, require_role
│       │
│       ├── models/                   # Beanie Documents — shape of data stored in MongoDB
│       │   ├── organization.py       # Tenant (org) document
│       │   ├── user.py               # User with role enum (admin | pricing_analyst)
│       │   ├── org_config.py         # Per-org thresholds, margin floors, escalation rules
│       │   ├── product.py            # SKU catalog — price, cost, stock
│       │   ├── competitor_price.py   # Scraped competitor prices per product
│       │   ├── demand_signal.py      # Demand/trend signals per product
│       │   ├── pricing_run.py        # A batch pricing run (groups many recommendations)
│       │   ├── pricing_recommendation.py  # AI recommendation + embedded agent reasoning
│       │   └── audit_log.py          # Immutable record of every price action
│       │
│       ├── schemas/                  # Pydantic models — shape of API request/response bodies
│       │   ├── common.py             # Shared: ApiResponse, PaginatedResponse, etc.
│       │   ├── auth.py               # LoginRequest, TokenResponse, SignupRequest
│       │   ├── user.py               # UserOut, UserUpdate
│       │   ├── product.py            # ProductOut, ProductCreate, ProductUpdate, ProductFilters
│       │   ├── recommendation.py     # RecommendationOut, ApproveRequest, RejectRequest
│       │   ├── run.py                # RunCreate, RunOut, RunProgress
│       │   ├── config.py             # OrgConfigOut, OrgConfigUpdate
│       │   └── audit.py              # AuditLogOut, AuditFilters
│       │
│       ├── routes/                   # URL definitions only — decorators + which controller fn to call
│       │   ├── auth.py               # POST /auth/signup, /auth/login, /auth/logout, /auth/refresh, /auth/me
│       │   ├── users.py              # GET /users, POST /users/invite, PATCH /users/{id}
│       │   ├── products.py           # GET/POST/PATCH/DELETE /products, GET /products/{id}
│       │   ├── recommendations.py    # GET /recommendations, GET /{id}, POST /{id}/approve|reject|modify
│       │   ├── runs.py               # POST /runs, GET /runs, GET /runs/{id}, GET /runs/{id}/stream
│       │   ├── audit.py              # GET /audit, GET /audit/export
│       │   ├── config.py             # GET/PUT /config, POST /config/reset
│       │   └── dashboard.py          # GET /dashboard/kpis, /dashboard/activity
│       │
│       ├── controllers/              # Thin glue: parse request → call service → return response
│       │   ├── auth_controller.py
│       │   ├── user_controller.py
│       │   ├── product_controller.py
│       │   ├── recommendation_controller.py
│       │   ├── run_controller.py
│       │   ├── audit_controller.py
│       │   ├── config_controller.py
│       │   └── dashboard_controller.py
│       │
│       ├── services/                 # All business logic — no HTTP, no request objects
│       │   ├── auth_service.py       # signup, login, token generation, password hashing
│       │   ├── user_service.py       # list users, invite user, update role
│       │   ├── product_service.py    # CRUD + search + filter + margin calculation
│       │   ├── recommendation_service.py  # approve/reject/modify, routing logic
│       │   ├── run_service.py        # trigger pipeline, track progress, update status
│       │   ├── audit_service.py      # create audit entries (called by other services)
│       │   ├── config_service.py     # read/update org config
│       │   └── dashboard_service.py  # aggregate KPIs and activity feed
│       │
│       ├── agents/                   # AI agents — each is one Groq API call with tool use
│       │   ├── base_agent.py         # Shared: Groq client, tool-use loop, timing
│       │   ├── orchestrator.py       # Runs all 5 agents in sequence, saves results, routes status
│       │   ├── market_intelligence_agent.py   # Agent 1: competitor gap analysis
│       │   ├── demand_forecasting_agent.py    # Agent 2: demand elasticity + trend
│       │   ├── inventory_cost_agent.py        # Agent 3: stock pressure + margin headroom
│       │   ├── pricing_strategy_agent.py      # Agent 4: synthesises → recommended price + confidence
│       │   └── execution_compliance_agent.py  # Agent 5: validates rules → routes to auto/human
│       │
│       ├── tools/                    # Python functions agents call via Groq tool use
│       │   ├── competitor_data.py    # get_competitor_prices(product_id) → list of prices
│       │   ├── demand_signals.py     # get_demand_signals(product_id) → trend data
│       │   ├── inventory_data.py     # get_inventory_levels(product_id) → stock + COGS
│       │   └── ecommerce_api.py      # apply_price_change(product_id, price) → mock platform API
│       │
│       ├── utils/                    # Shared helpers — no business logic, no HTTP
│       │   ├── logger.py             # get_logger(__name__) → structured logger
│       │   ├── jwt.py                # create_access_token, decode_access_token
│       │   ├── hashing.py            # hash_password, verify_password
│       │   ├── pagination.py         # paginate() helper used by all list endpoints
│       │   └── response.py           # ok(), error() — consistent JSON envelope
│       │
│       └── middleware/               # HTTP-level concerns (runs before every request)
│           └── tenant.py             # Logs org_id on each request for observability
│
├── frontend/                         # React + Vite SPA
│   └── src/
│       ├── main.tsx                  # Entry: mounts <App /> into #root
│       ├── App.tsx                   # React Router v6 — all routes + PrivateRoute wrapper
│       │
│       ├── pages/                    # One file per screen
│       │   ├── Login.tsx             # Signup + login tabs
│       │   ├── Dashboard.tsx         # KPI cards + activity feed
│       │   ├── Products.tsx          # Product catalog table with filters
│       │   ├── ProductDetail.tsx     # Single product + price history + last recommendation
│       │   ├── Recommendations.tsx   # Pending queue + all recommendations tabs
│       │   ├── RecommendationDetail.tsx  # Full AI reasoning accordion per agent
│       │   ├── Audit.tsx             # Audit trail table with filters
│       │   ├── Settings.tsx          # Admin-only config panel (thresholds, margins)
│       │   └── NotFound.tsx          # 404
│       │
│       ├── components/               # Reusable UI pieces, organised by feature
│       │   ├── layout/               # Shell: sidebar, topbar, route guards
│       │   ├── dashboard/            # KpiCard, ActivityFeed, ConfidenceChart
│       │   ├── products/             # ProductTable, ProductFilters, StatusBadge
│       │   ├── recommendations/      # RecommendationCard, AgentReasoningPanel, ConfidenceGauge, ApprovalActions
│       │   ├── audit/                # AuditTable, AuditFilters
│       │   ├── settings/             # ThresholdForm, MarginFloorForm
│       │   ├── common/               # LoadingSpinner, ErrorState, EmptyState, PageHeader
│       │   └── ui/                   # shadcn/ui generated components (do not edit manually)
│       │
│       ├── hooks/                    # React Query hooks — data fetching + mutations
│       │   ├── useAuth.ts
│       │   ├── useProducts.ts
│       │   ├── useRecommendations.ts
│       │   ├── useRuns.ts
│       │   ├── useAudit.ts
│       │   └── useDashboard.ts
│       │
│       ├── services/                 # Axios API call functions — one file per backend router
│       │   ├── authService.ts
│       │   ├── productService.ts
│       │   ├── recommendationService.ts
│       │   ├── runService.ts
│       │   ├── auditService.ts
│       │   ├── configService.ts
│       │   └── dashboardService.ts
│       │
│       ├── store/
│       │   └── authStore.ts          # Zustand — stores token + user after login
│       │
│       ├── lib/
│       │   ├── api.ts                # Axios instance with JWT interceptor + auto-refresh
│       │   ├── utils.ts              # cn(), formatCurrency(), formatDate()
│       │   └── constants.ts          # API base URL, role names, status labels
│       │
│       └── types/                    # TypeScript interfaces — mirror backend schemas
│           ├── api.ts                # ApiResponse<T>, PaginatedResponse<T>
│           ├── auth.ts               # User, LoginRequest, TokenResponse
│           ├── product.ts            # Product, ProductFilters
│           ├── recommendation.ts     # Recommendation, AgentReasoning, ToolCallTrace
│           ├── audit.ts              # AuditLog, AuditFilters
│           └── config.ts             # OrgConfig
│
├── docs/
│   ├── ARCHITECTURE.md               # System diagrams, data flow, DB schema, API list
│   └── DECISIONS.md                  # Tech choices, trade-offs, what you'd improve
│
├── README.md                         # Setup instructions, screenshots, known limitations
├── CLAUDE.md                         # This file — project map for AI tools + developers
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## Layered Architecture (how a request flows)

```
Browser
  │  HTTP request
  ▼
routes/          ← defines URL + HTTP method + which controller function handles it
  │  calls
  ▼
controllers/     ← parses request body/params, calls service, returns HTTP response
  │  calls
  ▼
services/        ← all business logic + DB queries (no HTTP concepts here)
  │  reads/writes
  ▼
models/          ← MongoDB document definitions (Beanie)
```

**Why this layering?**
- `routes/` stays clean — just decorators, no logic
- `controllers/` stays thin — no business rules, just glue
- `services/` is independently testable — no FastAPI, no HTTP
- `models/` is pure data shape — no request/response concerns

---

## Multi-Agent Pipeline

```
POST /api/v1/runs  →  run_service.trigger_run()
                            │
                            └─► orchestrator.run_for_product(product_id)
                                    │
                                    ├─ [1] MarketIntelligenceAgent
                                    │       tools: get_competitor_prices
                                    │       output: price_position, competitive_gap_pct
                                    │
                                    ├─ [2] DemandForecastingAgent
                                    │       tools: get_demand_signals
                                    │       output: demand_score, elasticity, trend_direction
                                    │
                                    ├─ [3] InventoryCostAgent
                                    │       tools: get_inventory_levels
                                    │       output: margin_headroom, inventory_pressure
                                    │
                                    ├─ [4] PricingStrategyAgent   ← synthesises all above
                                    │       tools: get_org_config
                                    │       output: recommended_price, confidence_score, strategy_label
                                    │
                                    └─ [5] ExecutionComplianceAgent  ← validates rules
                                            tools: check_price_bounds, check_margin_floor
                                            output: final_price, approval_routing
```

Each agent's output is stored **embedded inside the recommendation document** (no separate collection).
The detail page does a single MongoDB fetch — all 5 agent reasoning panels come from one document.

---

## Multi-Tenancy Rule

`org_id` is **always** extracted from the JWT. Never from the request body.

```python
# dependencies.py — runs on every protected endpoint
user = await User.get(payload["sub"])   # user.org_id is the tenant

# services receive org_id as a required parameter
await product_service.list_products(org_id=user.org_id, filters=filters)

# every MongoDB query filters by org_id
Product.find(Product.org_id == org_id, ...)
```

---

## Roles

| Role | Permissions |
|---|---|
| `admin` | Full access — configure thresholds, manage users, trigger runs, view all |
| `pricing_analyst` | View products + recommendations, approve/reject/modify, view audit |

---

## Running Locally

```bash
cp .env.example .env
# Set GROQ_API_KEY (free at console.groq.com) and JWT_SECRET

docker compose up
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| API docs | http://localhost:8000/api/docs |
