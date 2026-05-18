"""
middleware/rate_limit.py — Sliding-window rate limiter.

No external dependencies — pure Python using collections.deque.
Runs as a Starlette BaseHTTPMiddleware before every request.

Strategy:
  - Per-IP for unauthenticated / auth endpoints (login, signup)
  - Per-IP for everything else (dashboard is single-tenant per browser session)

Route-specific limits (tighter on expensive or sensitive endpoints):
  POST /api/v1/auth/login   → 10 req / 60s  per IP  (brute-force protection)
  POST /api/v1/auth/signup  → 10 req / 60s  per IP
  POST /api/v1/runs         →  5 req / 60s  per IP  (pipeline is expensive)
  Everything else           → 200 req / 60s per IP  (generous for a dashboard)

On limit hit:
  Returns HTTP 429 with Retry-After header and a standard JSON envelope.
  The request is NOT forwarded to any route handler.
"""
import time
from collections import deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# (method, path_prefix, limit, window_seconds)
_ROUTE_RULES: list[tuple[str, str, int, int]] = [
    ("POST", "/api/v1/auth/login",  10, 60),
    ("POST", "/api/v1/auth/signup", 10, 60),
    ("POST", "/api/v1/runs",         5, 60),
]
_DEFAULT_LIMIT  = 200
_DEFAULT_WINDOW = 60


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window rate limiter keyed by (method+path_rule, client_ip)."""

    def __init__(self, app) -> None:
        super().__init__(app)
        # key -> deque of monotonic timestamps within the current window
        self._windows: dict[str, deque] = {}

    # ── helpers ────────────────────────────────────────────────────────────────

    def _resolve_rule(self, method: str, path: str) -> tuple[int, int, str]:
        """Return (limit, window, rule_label) for this request."""
        for r_method, r_prefix, limit, window in _ROUTE_RULES:
            if method == r_method and path.startswith(r_prefix):
                return limit, window, f"{r_method}:{r_prefix}"
        return _DEFAULT_LIMIT, _DEFAULT_WINDOW, "default"

    def _check(self, key: str, limit: int, window: int) -> bool:
        """
        Sliding-window check.
        Returns True if the request should be blocked (rate limit exceeded).
        Side-effect: records the current timestamp when NOT blocked.
        """
        now    = time.monotonic()
        cutoff = now - window

        if key not in self._windows:
            self._windows[key] = deque()

        w = self._windows[key]
        while w and w[0] < cutoff:   # evict timestamps outside the window
            w.popleft()

        if len(w) >= limit:
            return True   # blocked

        w.append(now)
        return False      # allowed

    # ── middleware entry point ─────────────────────────────────────────────────

    async def dispatch(self, request: Request, call_next):
        # SSE streams must not be interrupted — skip rate limiting for them
        if request.url.path.endswith("/stream"):
            return await call_next(request)

        method = request.method
        path   = request.url.path
        ip     = request.client.host if request.client else "unknown"

        limit, window, rule_label = self._resolve_rule(method, path)
        key = f"{rule_label}:{ip}"

        if self._check(key, limit, window):
            return JSONResponse(
                status_code=429,
                content={
                    "ok": False,
                    "error": (
                        f"Rate limit exceeded — max {limit} requests "
                        f"per {window}s for this endpoint."
                    ),
                },
                headers={"Retry-After": str(window)},
            )

        return await call_next(request)
