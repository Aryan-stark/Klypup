"""
audit.py — Schemas for the audit trail.

Connected to: routes/audit.py, controllers/audit_controller.py
"""
from datetime import datetime
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: str
    product_id: str
    product_name: str | None       # joined
    recommendation_id: str | None
    actor_name: str | None         # joined from user
    action: str
    old_value: dict | None
    new_value: dict | None
    occurred_at: datetime


class AuditFilters(BaseModel):
    product_id: str | None = None
    action: str | None = None
    from_date: datetime | None = None
    to_date: datetime | None = None
    page: int = 1
    per_page: int = 50
