"""
tools/demand_signals.py — Demand and trend signal tool functions.

Mock demand signals are pre-seeded in MongoDB by the data generator.
Real implementation would call Google Trends API or an analytics platform.

Functions:
  - get_demand_signals(product_id, days=30) → demand signal readings
  - get_seasonal_index(category)            → seasonal demand multiplier by month
"""
from beanie import PydanticObjectId
from datetime import datetime, timezone, timedelta

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
    # TODO: implement
    # cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    # signals = await DemandSignal.find(
    #     DemandSignal.product_id == PydanticObjectId(product_id),
    #     DemandSignal.recorded_at >= cutoff,
    # ).to_list()
    # return {"signals": [...], "source": "mock_analytics"}
    pass


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
