"""
tools/demand_signals.py — Demand and trend signal tool functions.

Mock demand signals are pre-seeded in MongoDB by the data generator.
Real implementation would call Google Trends API or an analytics platform.

Functions:
  - get_demand_signals(product_id, days=30) → demand signal readings
  - get_seasonal_index(category)            → seasonal demand multiplier by month
"""
from datetime import datetime, timedelta, timezone

from beanie import PydanticObjectId

from app.models.demand_signal import DemandSignal

# Seasonal index by category and month (1=Jan, 12=Dec)
# Values >1.0 = above-average demand for that month
SEASONAL_INDEX = {
    "electronics":  [0.9, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.1, 1.1, 1.2, 1.5],
    "apparel":      [0.8, 0.8, 1.1, 1.2, 1.1, 0.9, 0.9, 1.0, 1.1, 1.0, 1.2, 1.3],
    "home_goods":   [0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 0.9, 0.9, 1.0, 1.1, 1.2],
    "sports":       [0.9, 0.9, 1.0, 1.1, 1.2, 1.2, 1.1, 1.1, 1.0, 0.9, 0.9, 0.9],
    "default":      [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
}


async def get_demand_signals(product_id: str, days: int = 30) -> dict:
    """
    Returns demand signals for a product from the last N days.
    Called by DemandForecastingAgent.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    signals = await DemandSignal.find(
        DemandSignal.product_id == PydanticObjectId(product_id),
        DemandSignal.recorded_at >= cutoff,
    ).sort("-recorded_at").to_list()

    entries = [
        {
            "signal_type": s.signal_type.value,
            "signal_value": s.signal_value,
            "trend_direction": s.trend_direction.value,
            "change_pct_7d": s.change_pct_7d,
            "change_pct_30d": s.change_pct_30d,
            "recorded_at": s.recorded_at.isoformat(),
        }
        for s in signals
    ]

    # Summarise by signal type for the agent
    by_type: dict = {}
    for e in entries:
        t = e["signal_type"]
        if t not in by_type:
            by_type[t] = []
        by_type[t].append(e["signal_value"])

    summary = {
        t: {
            "avg": round(sum(vals) / len(vals), 1),
            "latest": vals[0],
            "count": len(vals),
        }
        for t, vals in by_type.items()
    }

    # Overall demand score: average across all signal types (0–100)
    all_values = [e["signal_value"] for e in entries]
    overall_score = round(sum(all_values) / len(all_values), 1) if all_values else 50.0

    # Dominant trend direction
    directions = [e["trend_direction"] for e in entries]
    trend = max(set(directions), key=directions.count) if directions else "flat"

    return {
        "product_id": product_id,
        "signal_count": len(entries),
        "overall_demand_score": overall_score,
        "dominant_trend": trend,
        "by_type": summary,
        "source": "mock_analytics",
    }


async def get_seasonal_index(category: str) -> dict:
    """
    Returns the seasonal demand multiplier for the current month.
    Called by DemandForecastingAgent.
    """
    month = datetime.now(timezone.utc).month - 1   # 0-indexed
    index = SEASONAL_INDEX.get(category.lower(), SEASONAL_INDEX["default"])
    return {
        "category": category,
        "current_month": month + 1,
        "seasonal_multiplier": index[month],
        "source": "mock_seasonal_table",
    }
