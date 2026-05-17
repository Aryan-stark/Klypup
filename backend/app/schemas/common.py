"""
common.py — Shared Pydantic response wrappers used by every endpoint.

Why: Every API response is wrapped in the same envelope so the frontend
always knows the shape: { data: ..., meta: ... } or { error: ... }.
This avoids each endpoint inventing its own response format.

Connected to: all controllers return ApiResponse or PaginatedResponse.
"""
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard single-item response."""
    data: T
    message: str = "ok"


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated list response."""
    data: list[T]
    meta: PaginationMeta
