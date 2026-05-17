"""
services/dashboard_service.py — Aggregated KPIs for the dashboard home page.
"""
from beanie import PydanticObjectId

from app.models.pricing_recommendation import PricingRecommendation, RecommendationStatus
from app.models.audit_log import AuditLog


async def get_kpis(org_id: PydanticObjectId) -> dict:
    """
    Returns aggregate counts shown on the dashboard KPI cards:
      - pending_approvals: recommendations waiting for analyst action
      - auto_applied_today: recommendations auto-executed in the last 24h
      - avg_confidence: mean confidence score across all recommendations
      - total_recommendations: total ever generated for this org
    """
    # TODO: implement using MongoDB aggregation pipeline
    pass


async def get_activity(org_id: PydanticObjectId) -> list:
    """
    Returns the 20 most recent audit log entries for the activity feed.
    """
    # TODO: implement
    pass
