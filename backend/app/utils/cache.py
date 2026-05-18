"""
utils/cache.py — In-memory TTL cache for async tool calls.

No Redis or external deps required — single-process asyncio safe.
All writes are synchronous dict operations; asyncio runs on one thread,
so there are no race conditions.

Usage:
    from app.utils.cache import tool_cache, TTL_PRODUCT, TTL_ORG_CONFIG

    cached = tool_cache.get(f"product:{product_id}")
    if cached is None:
        cached = await fetch_from_db(product_id)
        tool_cache.set(f"product:{product_id}", cached, ttl=TTL_PRODUCT)
    return cached

Cache key convention:
    "<resource>:<id>"              e.g. "product:abc123"
    "<resource>:<id>:<param>"      e.g. "competitor:abc123:7"

Invalidation:
    tool_cache.invalidate("product:")       # all product entries
    tool_cache.invalidate("org_config:")    # all org config entries
    tool_cache.invalidate()                 # everything
"""
import time
from typing import Any


# ── TTL constants (seconds) ────────────────────────────────────────────────────
TTL_PRODUCT     = 300    # 5 min  — current price / stock changes slowly during a run
TTL_COMPETITOR  = 600    # 10 min — competitor scrapes are pre-seeded mock data
TTL_DEMAND      = 600    # 10 min — demand signals are pre-seeded mock data
TTL_SEASONAL    = 3_600  # 1 hr   — derived from a static lookup table
TTL_ORG_CONFIG  = 300    # 5 min  — admins rarely change config mid-run
TTL_ORG_MARGIN  = 300    # 5 min  — same MongoDB document, just a different view


class TTLCache:
    """
    Key-value store with per-entry TTL expiry.

    Expired entries are evicted lazily on .get() and eagerly via .evict_expired().
    The .size property counts only live (non-expired) entries.
    """

    def __init__(self) -> None:
        # key -> (value, expires_at monotonic timestamp)
        self._store: dict[str, tuple[Any, float]] = {}

    # ── Read ───────────────────────────────────────────────────────────────────

    def get(self, key: str) -> Any | None:
        """Return the cached value, or None if missing or expired."""
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.monotonic() > expires_at:
            del self._store[key]
            return None
        return value

    # ── Write ──────────────────────────────────────────────────────────────────

    def set(self, key: str, value: Any, ttl: int) -> None:
        """Store value under key for ttl seconds."""
        self._store[key] = (value, time.monotonic() + ttl)

    # ── Invalidation ───────────────────────────────────────────────────────────

    def invalidate(self, prefix: str = "") -> int:
        """
        Remove all entries whose key starts with prefix.
        If prefix is empty, clear the entire cache.
        Returns the number of entries removed.
        """
        if not prefix:
            count = len(self._store)
            self._store.clear()
            return count
        keys = [k for k in self._store if k.startswith(prefix)]
        for k in keys:
            del self._store[k]
        return len(keys)

    def evict_expired(self) -> int:
        """Proactively remove all expired entries. Returns count removed."""
        now = time.monotonic()
        expired = [k for k, (_, exp) in self._store.items() if exp <= now]
        for k in expired:
            del self._store[k]
        return len(expired)

    # ── Introspection ──────────────────────────────────────────────────────────

    @property
    def size(self) -> int:
        """Number of live (non-expired) entries."""
        now = time.monotonic()
        return sum(1 for _, (_, exp) in self._store.items() if exp > now)

    def stats(self) -> dict:
        now = time.monotonic()
        live    = [(k, exp) for k, (_, exp) in self._store.items() if exp > now]
        expired = len(self._store) - len(live)
        return {
            "live_entries": len(live),
            "expired_pending_eviction": expired,
            "keys": [k for k, _ in live],
        }


# ── Module-level singleton ─────────────────────────────────────────────────────
# Shared across all tool calls in the same process.
tool_cache = TTLCache()
