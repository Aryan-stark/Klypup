"""
models/audit_log.py — Immutable audit trail of every price action.

Why immutable?
  Audit logs must be trustworthy. They are never updated or deleted.
  Every price change, approval, rejection, and config change creates a new entry.
  This gives a complete, tamper-evident history.

Actions logged:
  - price_updated          (auto-applied or approved by analyst)
  - recommendation_approved
  - recommendation_rejected
  - recommendation_escalated
  - config_changed         (admin changed thresholds)
  - run_triggered          (pricing run started)
"""
from datetime import datetime, timezone

from beanie import Document, PydanticObjectId
from pydantic import Field


class AuditLog(Document):
    org_id: PydanticObjectId
    product_id: PydanticObjectId | None = None
    recommendation_id: PydanticObjectId | None = None

    actor_id: PydanticObjectId | None = None    # None = system (auto-apply)
    action: str

    old_value: dict | None = None               # e.g. {"price": 49.99}
    new_value: dict | None = None               # e.g. {"price": 54.99}
    metadata: dict | None = None                # extra context

    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "audit_logs"
        indexes = [
            [("org_id", 1), ("occurred_at", -1)],
            [("org_id", 1), ("product_id", 1), ("occurred_at", -1)],
            [("actor_id", 1), ("occurred_at", -1)],
        ]
