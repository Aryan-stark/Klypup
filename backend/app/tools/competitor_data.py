"""
tools/competitor_data.py — Competitor price data tool functions.

These are plain Python async functions called by agents during tool use.
They query MongoDB for the latest competitor prices (which were pre-seeded
by the mock data generator).

In a real system, these would call a live scraping service.
In this implementation, mock data is stored in MongoDB — agents can't tell the difference.

Functions:
  - get_competitor_prices(product_id, days=7)  → list of competitor price entries
  - get_product_details(product_id)            → basic product info
"""
from beanie import PydanticObjectId
from datetime import datetime, timezone, timedelta

from app.models.competitor_price import CompetitorPrice
from app.models.product import Product


async def get_competitor_prices(product_id: str, days: int = 7) -> dict:
    """
    Returns the latest competitor prices for a product from the last N days.
    Called by MarketIntelligenceAgent.
    """
    # TODO: implement
    # cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    # prices = await CompetitorPrice.find(
    #     CompetitorPrice.product_id == PydanticObjectId(product_id),
    #     CompetitorPrice.scraped_at >= cutoff,
    # ).sort(-CompetitorPrice.scraped_at).to_list()
    # return {"prices": [...], "source": "mock_scraper"}
    pass


async def get_product_details(product_id: str) -> dict:
    """
    Returns current price and basic info for a product.
    Called by MarketIntelligenceAgent to know what our current price is.
    """
    # TODO: implement
    pass
