"""
models/pricing_recommendation.py — The central document of the entire system.

Why agent_reasoning is embedded (not a separate collection):
  The Recommendation Detail page needs all 5 agent outputs at once.
  Embedding means one MongoDB fetch = complete detail page data.
  No joins, no multiple queries.

RecommendationStatus flow:
  pending → approved → applied
  pending → rejected
  pending → escalated
  auto_approved → applied (immediately, no human step)
"""
from datetime import datetime, timezone
from enum import Enum

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field


class RecommendationStatus(str, Enum):
    PENDING = "pending"
    AUTO_APPROVED = "auto_approved"
    APPROVED = "approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"
    APPLIED = "applied"


class ToolCallTrace(BaseModel):
    """One tool call made by an agent — stored for UI transparency."""
    tool_name: str
    arguments: dict
    result: dict
    execution_ms: int = 0


class AgentReasoning(BaseModel):
    """One agent's full reasoning — embedded inside the recommendation."""
    agent_name: str
    input_context: dict
    tool_calls: list[ToolCallTrace] = []
    output_signal: dict
    narrative: str
    confidence_contrib: float | None = None
    execution_ms: int = 0


class PricingRecommendation(Document):
    org_id: PydanticObjectId
    run_id: PydanticObjectId
    product_id: PydanticObjectId

    current_price: float
    recommended_price: float
    price_change_pct: float             # signed: -0.05 = 5% drop

    confidence_score: float             # 0.0 – 1.0
    strategy_label: str
    rationale_summary: str

    agent_reasoning: list[AgentReasoning] = []   # ← all 5 agents embedded here

    status: RecommendationStatus = RecommendationStatus.PENDING

    reviewed_by: PydanticObjectId | None = None
    reviewed_at: datetime | None = None
    review_note: str | None = None

    second_approver_id: PydanticObjectId | None = None
    second_approved_at: datetime | None = None

    applied_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "pricing_recommendations"
        indexes = [
            [("org_id", 1), ("status", 1), ("created_at", -1)],
            [("org_id", 1), ("product_id", 1), ("created_at", -1)],
            [("run_id", 1)],
            [("confidence_score", -1)],
        ]
