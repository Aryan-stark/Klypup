"""
services/recommendation_service.py — Recommendation list, detail, and approval workflow.

Responsibilities:
  - Query and filter recommendations (tenant-scoped)
  - Approve: update status, call ecommerce_api, create audit entry
  - Reject: update status with reason, create audit entry
  - Modify: override price, approve at new price, create audit entry
"""
from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models.pricing_recommendation import PricingRecommendation, RecommendationStatus
from app.services import audit_service
from app.tools import ecommerce_api


async def list_recommendations(org_id, status, run_id, product_id,
                                confidence_min, page, per_page) -> dict:
    # TODO: implement — build query, paginate, join product name
    pass


async def get_recommendation(org_id: PydanticObjectId, rec_id: str) -> dict:
    """Returns full recommendation with all embedded agent_reasoning."""
    # TODO: implement — verify org_id match, return full doc
    pass


async def approve(org_id, rec_id: str, user_id, note: str) -> dict:
    """
    1. Load recommendation, verify it's pending and belongs to this org
    2. Call ecommerce_api.apply_price_change()
    3. Update recommendation status to "applied"
    4. Create audit log entry
    """
    # TODO: implement
    pass


async def reject(org_id, rec_id: str, user_id, reason: str, note: str) -> dict:
    """
    1. Load recommendation, verify pending + org
    2. Update status to "rejected", store reason
    3. Create audit log entry
    """
    # TODO: implement
    pass


async def modify(org_id, rec_id: str, user_id, override_price: float, note: str) -> dict:
    """
    Analyst overrides the AI price and approves at the new price.
    1. Load recommendation, verify pending + org
    2. Validate override_price is within product's min/max bounds
    3. Call ecommerce_api.apply_price_change() at override_price
    4. Update recommendation with override_price + status=applied
    5. Create audit log entry (records both AI price and actual price applied)
    """
    # TODO: implement
    pass
