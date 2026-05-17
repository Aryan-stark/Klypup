from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.database import init_db
from app.middleware.tenant import log_requests
from app.routes import auth, products, recommendations, runs, audit, config, users, dashboard
from app.utils.logger import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — connecting to MongoDB...")
    await init_db()
    logger.info("MongoDB connected and Beanie initialized.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Klypup Pricing Intelligence API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(BaseHTTPMiddleware, dispatch=log_requests)

# ─── Routers ────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth.router,            prefix=f"{API_PREFIX}/auth",            tags=["Auth"])
app.include_router(users.router,           prefix=f"{API_PREFIX}/users",           tags=["Users"])
app.include_router(products.router,        prefix=f"{API_PREFIX}/products",        tags=["Products"])
app.include_router(recommendations.router, prefix=f"{API_PREFIX}/recommendations", tags=["Recommendations"])
app.include_router(runs.router,            prefix=f"{API_PREFIX}/runs",            tags=["Pricing Runs"])
app.include_router(audit.router,           prefix=f"{API_PREFIX}/audit",           tags=["Audit"])
app.include_router(config.router,          prefix=f"{API_PREFIX}/config",          tags=["Config"])
app.include_router(dashboard.router,       prefix=f"{API_PREFIX}/dashboard",       tags=["Dashboard"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "env": settings.APP_ENV}
