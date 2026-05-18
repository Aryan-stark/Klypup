"""
config.py — Schemas for the Admin configuration panel.

Connected to: routes/config.py, controllers/config_controller.py
"""
from typing import Literal
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


# ── AI Configuration ──────────────────────────────────────────────────────────

class AIConfigOut(BaseModel):
    """Returned by GET /config/ai — key is never exposed in full."""
    ai_provider: str | None          # "cerebras" | "gemini" | "groq" | None
    ai_model: str | None             # model name string
    ai_key_set: bool                 # True when a key is stored
    ai_key_preview: str | None       # "sk-***...abc" — first 4 + last 4 chars


class AIConfigUpdate(BaseModel):
    """PUT /config/ai — send only the fields you want to change."""
    ai_provider: Literal["cerebras", "gemini", "groq"] | None = None
    ai_model: str | None = None
    # Omit (None) to keep the existing key; send a non-empty string to replace it.
    ai_api_key: str | None = None


class AIVerifyRequest(BaseModel):
    """POST /config/ai/verify — test a provider+model+key combination."""
    ai_provider: Literal["cerebras", "gemini", "groq"] | None = None
    ai_model: str | None = None
    # If None, the stored key is used so admins can verify without re-entering it.
    ai_api_key: str | None = None


class AIVerifyResponse(BaseModel):
    ok: bool
    message: str
    latency_ms: int | None = None
