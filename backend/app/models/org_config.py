from datetime import datetime, timezone

from beanie import Document, PydanticObjectId
from pydantic import Field


class OrgConfig(Document):
    org_id: PydanticObjectId                       # unique per org

    # Confidence thresholds (0.0 – 1.0)
    auto_apply_threshold: float = 0.90             # >= this → auto-approved
    human_review_threshold: float = 0.70           # >= this → pending review
    reject_below_threshold: float = 0.50           # < this  → auto-rejected

    # Price change caps
    max_price_increase_pct: float = 0.20           # 20% max raise per run
    max_price_decrease_pct: float = 0.15           # 15% max drop per run

    # Margin rules
    global_margin_floor_pct: float = 0.15          # must keep 15% gross margin

    # Escalation
    escalation_email: str | None = None
    require_dual_approval: bool = False

    # AI provider config (set via admin Settings → AI Configuration)
    # Falls back to env-var keys when all three are None.
    ai_provider: str | None = None   # "cerebras" | "gemini" | "groq"
    ai_model: str | None = None      # e.g. "llama3.1-8b", "gemini-2.5-flash"
    ai_api_key: str | None = None    # stored in DB; never returned in full to the frontend

    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: PydanticObjectId | None = None

    class Settings:
        name = "org_configs"
        indexes = ["org_id"]
