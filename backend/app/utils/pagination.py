"""
utils/pagination.py — Helper for consistent pagination across all list endpoints.

Used by every service that returns a list:
  product_service, recommendation_service, audit_service, etc.
"""
import math
from app.schemas.common import PaginatedResponse, PaginationMeta


def paginate(items: list, total: int, page: int, per_page: int) -> dict:
    """
    Wraps a list of items in a PaginatedResponse.

    Args:
      items:    the current page's items (already sliced)
      total:    total count matching the query (for frontend to know total pages)
      page:     current page number (1-indexed)
      per_page: items per page
    """
    return {
        "data": items,
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": math.ceil(total / per_page) if per_page > 0 else 1,
        },
    }


def skip_limit(page: int, per_page: int) -> tuple[int, int]:
    """Returns (skip, limit) values for MongoDB .skip().limit() queries."""
    skip = (page - 1) * per_page
    return skip, per_page
