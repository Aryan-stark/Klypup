"""
utils/response.py — Consistent JSON envelope helpers.

Every API response follows:
  { "success": true/false, "data": ..., "message": "..." }

Controllers call ok() or error() instead of building dicts by hand.
"""
from typing import Any


def ok(data: Any = None, message: str = "ok") -> dict:
    """Wrap a successful response payload."""
    return {"success": True, "data": data, "message": message}


def error(message: str, data: Any = None) -> dict:
    """Wrap an error payload (used before raising HTTPException or in 200-level error paths)."""
    return {"success": False, "data": data, "message": message}
