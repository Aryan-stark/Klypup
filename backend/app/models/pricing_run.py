from datetime import datetime, timezone
from enum import Enum

from beanie import Document, PydanticObjectId
from pydantic import Field


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class RunTrigger(str, Enum):
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    API = "api"


class PricingRun(Document):
    org_id: PydanticObjectId
    triggered_by: PydanticObjectId | None = None   # None = scheduled
    trigger_mode: RunTrigger = RunTrigger.MANUAL

    status: RunStatus = RunStatus.PENDING
    product_filter: dict | None = None             # {"categories": [...]} or None = all

    total_products: int = 0
    products_processed: int = 0
    recommendations_generated: int = 0

    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None
    error_message: str | None = None

    class Settings:
        name = "pricing_runs"
        indexes = [
            [("org_id", 1), ("started_at", -1)],
            [("org_id", 1), ("status", 1)],
        ]
