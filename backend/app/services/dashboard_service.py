"""
services/dashboard_service.py — Aggregated KPIs for the dashboard home page.
"""
import asyncio
from datetime import datetime, timezone

from beanie import PydanticObjectId

from app.models.audit_log import AuditLog
from app.models.pricing_recommendation import PricingRecommendation, RecommendationStatus
from app.models.product import Product


async def get_kpis(org_id: PydanticObjectId) -> dict:
    """
    Returns aggregate counts for the dashboard KPI cards.
    All four counts run in parallel via asyncio.gather.
    """
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    pending_count, auto_today, total_recs, active_products = await asyncio.gather(
        # Recommendations waiting for analyst action
        PricingRecommendation.find(
            PricingRecommendation.org_id == org_id,
            PricingRecommendation.status.in_([
                RecommendationStatus.PENDING,
                RecommendationStatus.ESCALATED,
            ]),
        ).count(),

        # Auto-applied today
        PricingRecommendation.find(
            PricingRecommendation.org_id == org_id,
            PricingRecommendation.status == RecommendationStatus.AUTO_APPROVED,
            PricingRecommendation.applied_at >= today_start,
        ).count(),

        # Total ever generated
        PricingRecommendation.find(
            PricingRecommendation.org_id == org_id,
        ).count(),

        # Active products in catalog
        Product.find(
            Product.org_id == org_id,
            Product.is_active == True,
        ).count(),
    )

    # Average confidence — aggregation pipeline (single round-trip)
    agg = await PricingRecommendation.find(
        PricingRecommendation.org_id == org_id,
    ).aggregate([
        {"$group": {"_id": None, "avg": {"$avg": "$confidence_score"}}}
    ]).to_list()
    avg_confidence = round(agg[0]["avg"], 3) if agg else 0.0

    return {
        "pending_approvals": pending_count,
        "auto_applied_today": auto_today,
        "avg_confidence_score": avg_confidence,
        "total_recommendations": total_recs,
        "active_products": active_products,
    }


async def get_activity(org_id: PydanticObjectId) -> list:
    """Returns the 20 most recent audit log entries for the activity feed."""
    entries = await AuditLog.find(
        AuditLog.org_id == org_id,
    ).sort("-occurred_at").limit(20).to_list()

    return [
        {
            "id": str(e.id),
            "action": e.action,
            "product_id": str(e.product_id) if e.product_id else None,
            "recommendation_id": str(e.recommendation_id) if e.recommendation_id else None,
            "actor_id": str(e.actor_id) if e.actor_id else None,
            "old_value": e.old_value,
            "new_value": e.new_value,
            "metadata": e.metadata,
            "occurred_at": e.occurred_at.isoformat(),
        }
        for e in entries
    ]
