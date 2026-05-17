"""
tools/ecommerce_api.py — Mock e-commerce platform API.

Simulates sending a price update to an external e-commerce platform
(e.g. Shopify, WooCommerce, custom internal system).

Called by:
  - orchestrator (auto-approved recommendations)
  - recommendation_service.approve() (human-approved recommendations)

Includes:
  - Simulated success/failure (configurable failure rate for demo)
  - Rollback logic on failure
  - Audit-ready return value

In a real system, this would be an HTTP call to the platform's API.
"""
import random
from datetime import datetime, timezone

from app.utils.logger import get_logger

logger = get_logger(__name__)

# Simulated failure rate — 5% of calls "fail" to demo error handling
SIMULATED_FAILURE_RATE = 0.05


async def apply_price_change(product_id: str, new_price: float) -> dict:
    """
    Sends a price update to the mock e-commerce platform.

    Returns:
      {"success": True, "applied_price": float, "applied_at": str}
      or
      {"success": False, "error": str, "rolled_back": True}
    """
    logger.info(f"[ecommerce_api] Applying price {new_price} to product {product_id}")

    # Simulate occasional API failures
    if random.random() < SIMULATED_FAILURE_RATE:
        logger.warning(f"[ecommerce_api] Simulated failure for product {product_id}")
        # Rollback: in a real system this would revert to the previous price
        await _rollback(product_id)
        return {
            "success": False,
            "error": "Platform API timeout — price change not applied",
            "rolled_back": True,
        }

    # TODO: update Product.current_price in MongoDB
    # product = await Product.get(product_id)
    # product.current_price = new_price
    # product.updated_at = datetime.now(timezone.utc)
    # await product.save()

    return {
        "success": True,
        "applied_price": new_price,
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "source": "mock_ecommerce_platform",
    }


async def _rollback(product_id: str) -> None:
    """
    Rollback — reverts product price to previous value.
    In this mock implementation, the DB was not yet updated, so nothing to undo.
    In production: fetch last audit log entry and restore that price.
    """
    logger.info(f"[ecommerce_api] Rollback executed for product {product_id}")
