"""
run.py — Schemas for triggering and tracking pricing runs.

Connected to: routes/runs.py, controllers/run_controller.py
"""
from datetime import datetime
from pydantic import BaseModel


class RunCreate(BaseModel):
    """Body for POST /runs. Optional filter narrows which products are processed."""
    product_filter: dict | None = None  # e.g. {"categories": ["electronics"]}


class RunOut(BaseModel):
    id: str
    status: str
    trigger_mode: str
    total_products: int
    products_processed: int
    recommendations_generated: int
    started_at: datetime
    completed_at: datetime | None
    error_message: str | None
