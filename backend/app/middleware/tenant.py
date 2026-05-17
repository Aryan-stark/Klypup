"""
middleware/tenant.py — Request logging middleware.

Logs org_id on each authenticated request for observability.
This makes it easy to trace which org triggered which action in logs.

Note: tenant isolation is NOT enforced here — it is enforced in dependencies.py
via get_current_user(). This middleware is for logging only.
"""
import time

from fastapi import Request
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def log_requests(request: Request, call_next):
    """
    FastAPI middleware: runs before and after every request.
    Logs method, path, status code, and response time.
    """
    start = time.monotonic()
    response = await call_next(request)
    duration_ms = int((time.monotonic() - start) * 1000)

    logger.info(
        f"{request.method} {request.url.path} "
        f"→ {response.status_code} ({duration_ms}ms)"
    )
    return response
