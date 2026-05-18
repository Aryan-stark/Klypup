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

Caching:
  Both functions cache results in the module-level TTLCache (utils/cache.py).
  - competitor prices: 10 min TTL  (scrapes are infrequent; data doesn't change mid-run)
  - product details:   5 min TTL   (price/stock update slowly during a pricing run)
"""
from datetime import datetime, timedelta, timezone

from beanie import PydanticObjectId

from app.models.competitor_price import CompetitorPrice
from app.models.product import Product
from app.utils.cache import tool_cache, TTL_COMPETITOR, TTL_PRODUCT
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def get_competitor_prices(product_id: str, days: int = 7) -> dict:
    """
    Returns the latest competitor prices for a product from the last N days.
    Called by MarketIntelligenceAgent.
    Results are cached for TTL_COMPETITOR seconds to avoid redundant DB reads
    if multiple agents or retries request the same product within a run.
    """
    cache_key = f"competitor:{product_id}:{int(days)}"
    cached = tool_cache.get(cache_key)
    if cached is not None:
        logger.debug(f"[cache hit] {cache_key}")
        return cached

    cutoff = datetime.now(timezone.utc) - timedelta(days=int(days))
    prices = await CompetitorPrice.find(
        CompetitorPrice.product_id == PydanticObjectId(product_id),
        CompetitorPrice.scraped_at >= cutoff,
    ).sort("-scraped_at").to_list()

    entries = [
        {
            "competitor_name": p.competitor_name,
            "price": p.price,
            "currency": p.currency,
            "in_stock": p.in_stock,
            "scraped_at": p.scraped_at.isoformat(),
        }
        for p in prices
    ]

    in_stock_prices = [p["price"] for p in entries if p["in_stock"]]
    avg_price = round(sum(in_stock_prices) / len(in_stock_prices), 2) if in_stock_prices else None
    min_price = min(in_stock_prices) if in_stock_prices else None
    max_price = max(in_stock_prices) if in_stock_prices else None

    result = {
        "product_id": product_id,
        "competitor_count": len(entries),
        "in_stock_count": len(in_stock_prices),
        "avg_competitor_price": avg_price,
        "min_competitor_price": min_price,
        "max_competitor_price": max_price,
        "entries": entries,
        "source": "mock_scraper",
    }

    tool_cache.set(cache_key, result, ttl=TTL_COMPETITOR)
    return result


async def get_product_details(product_id: str) -> dict:
    """
    Returns current price and basic info for a product.
    Called by MarketIntelligenceAgent to know what our current price is.
    Result is cached for TTL_PRODUCT seconds — the same product may be
    looked up by multiple agents within the same pipeline run.
    """
    cache_key = f"product:{product_id}"
    cached = tool_cache.get(cache_key)
    if cached is not None:
        logger.debug(f"[cache hit] {cache_key}")
        return cached

    product = await Product.get(product_id)
    if not product:
        return {"error": f"Product {product_id} not found"}

    result = {
        "product_id": product_id,
        "name": product.name,
        "sku": product.sku,
        "category": product.category,
        "current_price": product.current_price,
        "cost_basis": product.cost_basis,
        "min_price": product.min_price,
        "max_price": product.max_price,
        "msrp": product.msrp,
        "brand": product.brand,
    }

    tool_cache.set(cache_key, result, ttl=TTL_PRODUCT)
    return result
