"""
recommendation.py — Request/response shapes for recommendations + approval workflow.

The RecommendationDetailOut includes the full embedded agent reasoning,
which powers the Recommendation Detail page in the frontend.

Connected to: routes/recommendations.py, controllers/recommendation_controller.py
"""
from datetime import datetime
from pydantic import BaseModel


class ToolCallTraceOut(BaseModel):
    tool_name: str
    arguments: dict
    result: dict
    execution_ms: int


class AgentReasoningOut(BaseModel):
    agent_name: str
    narrative: str
    output_signal: dict
    tool_calls: list[ToolCallTraceOut]
    confidence_contrib: float | None
    execution_ms: int


class RecommendationOut(BaseModel):
    """Summary view — shown in the recommendations list."""
    id: str
    product_id: str
    product_name: str               # joined from product
    product_sku: str
    current_price: float
    recommended_price: float
    price_change_pct: float
    confidence_score: float
    strategy_label: str
    rationale_summary: str
    status: str
    created_at: datetime


class RecommendationDetailOut(RecommendationOut):
    """Full detail view — includes all agent reasoning."""
    agent_reasoning: list[AgentReasoningOut]
    reviewed_by: str | None
    reviewed_at: datetime | None
    review_note: str | None


class ApproveRequest(BaseModel):
    note: str = ""


class RejectRequest(BaseModel):
    reason: str                     # required — stored in audit log
    note: str = ""


class ModifyRequest(BaseModel):
    """Analyst overrides the AI price and approves."""
    override_price: float
    note: str = ""
