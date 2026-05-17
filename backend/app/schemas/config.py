"""
config.py — Schemas for the Admin configuration panel.

Connected to: routes/config.py, controllers/config_controller.py
"""
from pydantic import BaseModel, Field


class OrgConfigOut(BaseModel):
    auto_apply_threshold: float
    human_review_threshold: float
    reject_below_threshold: float
    max_price_increase_pct: float
    max_price_decrease_pct: float
    global_margin_floor_pct: float
    escalation_email: str | None
    require_dual_approval: bool


class OrgConfigUpdate(BaseModel):
    auto_apply_threshold: float | None = Field(None, ge=0.0, le=1.0)
    human_review_threshold: float | None = Field(None, ge=0.0, le=1.0)
    reject_below_threshold: float | None = Field(None, ge=0.0, le=1.0)
    max_price_increase_pct: float | None = Field(None, ge=0.0, le=1.0)
    max_price_decrease_pct: float | None = Field(None, ge=0.0, le=1.0)
    global_margin_floor_pct: float | None = Field(None, ge=0.0, le=1.0)
    escalation_email: str | None = None
    require_dual_approval: bool | None = None
