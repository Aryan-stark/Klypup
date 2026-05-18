"""
services/dashboard_service.py — Aggregated KPIs for the dashboard home page.
"""
import asyncio
from datetime import datetime, timezone

from beanie import PydanticObjectId
from beanie.operators import In

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
            In(PricingRecommendation.status, [
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

    # Average confidence + distribution buckets — single aggregation round-trip
    agg = await PricingRecommendation.find(
        PricingRecommendation.org_id == org_id,
    ).aggregate([
        {"$group": {
            "_id": {"$switch": {
                "branches": [
                    {"case": {"$lt": ["$confidence_score", 0.50]}, "then": 0},
                    {"case": {"$lt": ["$confidence_score", 0.65]}, "then": 1},
                    {"case": {"$lt": ["$confidence_score", 0.80]}, "then": 2},
                    {"case": {"$lt": ["$confidence_score", 0.90]}, "then": 3},
                ],
                "default": 4,
            }},
            "count": {"$sum": 1},
            "sum_confidence": {"$sum": "$confidence_score"},
        }},
    ]).to_list()

    bucket_map = {r["_id"]: r for r in agg}
    total_for_avg = sum(r["count"] for r in agg)
    total_confidence = sum(r["sum_confidence"] for r in agg)
    avg_confidence = round(total_confidence / total_for_avg, 3) if total_for_avg else 0.0

    confidence_distribution = [
        {"label": "<50%",   "count": bucket_map.get(0, {}).get("count", 0), "color": "#ef4444"},
        {"label": "50–65%", "count": bucket_map.get(1, {}).get("count", 0), "color": "#f97316"},
        {"label": "65–80%", "count": bucket_map.get(2, {}).get("count", 0), "color": "#eab308"},
        {"label": "80–90%", "count": bucket_map.get(3, {}).get("count", 0), "color": "#84cc16"},
        {"label": "90%+",   "count": bucket_map.get(4, {}).get("count", 0), "color": "#22c55e"},
    ]

    return {
        "pending_approvals": pending_count,
        "auto_applied_today": auto_today,
        "avg_confidence_score": avg_confidence,
        "total_recommendations": total_recs,
        "active_products": active_products,
        "confidence_distribution": confidence_distribution,
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
