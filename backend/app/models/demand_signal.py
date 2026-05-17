from datetime import datetime, timezone
from enum import Enum

from beanie import Document, PydanticObjectId
from pydantic import Field


class SignalType(str, Enum):
    SEARCH_VOLUME = "search_volume"
    SOCIAL_TREND = "social_trend"
    SEASONAL = "seasonal"
    HISTORICAL_SALES = "historical_sales"


class TrendDirection(str, Enum):
    UP = "up"
    DOWN = "down"
    FLAT = "flat"


class DemandSignal(Document):
    org_id: PydanticObjectId
    product_id: PydanticObjectId

    signal_type: SignalType
    signal_value: float               # normalised 0–100
    trend_direction: TrendDirection
    change_pct_7d: float | None = None
    change_pct_30d: float | None = None
    source: str = "mock"
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "demand_signals"
        indexes = [
            [("org_id", 1), ("product_id", 1), ("signal_type", 1), ("recorded_at", -1)],
        ]
