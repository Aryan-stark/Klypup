"""
tools/inventory_data.py — Inventory, cost, and compliance check tool functions.

These functions are called by InventoryCostAgent and ExecutionComplianceAgent.

Functions:
  - get_inventory_levels(product_id)              → stock, COGS, reorder status
  - get_org_margin_floor(org_id)                  → org's configured margin floor
  - get_org_config(org_id)                        → full org pricing config
  - check_price_bounds(product_id, price)         → pass/fail + clipped price
  - check_margin_floor(product_id, org_id, price) → pass/fail + min_viable_price
  - check_rate_of_change(product_id, org_id, price) → pass/fail + max allowed price

Caching:
  - get_inventory_levels : 5 min TTL  (stock doesn't change mid-run)
  - get_org_margin_floor : 5 min TTL  (org config rarely changes during a run)
  - get_org_config       : 5 min TTL  (same document, broader view)

  check_* functions include a user-supplied recommended_price so the full
  result is not cached. However they re-use the cached product and org config
  via the helpers above, which avoids repeated DB round-trips.
"""
from beanie import PydanticObjectId

from app.models.org_config import OrgConfig
from app.models.product import Product
from app.utils.cache import tool_cache, TTL_PRODUCT, TTL_ORG_CONFIG, TTL_ORG_MARGIN
from app.utils.logger import get_logger

logger = get_logger(__name__)


# ── Private cached helpers ─────────────────────────────────────────────────────

async def _get_product(product_id: str) -> Product | None:
    """Cached Product.get() — avoids repeated DB reads within the same run."""
    cache_key = f"product_doc:{product_id}"
    cached = tool_cache.get(cache_key)
    if cached is not None:
        logger.debug(f"[cache hit] {cache_key}")
        return cached
    product = await Product.get(product_id)
    if product:
        tool_cache.set(cache_key, product, ttl=TTL_PRODUCT)
    return product


async def _get_org_config(org_id: str) -> OrgConfig | None:
    """Cached OrgConfig lookup — org config is shared across agents 3, 4 and 5."""
    cache_key = f"org_config_doc:{org_id}"
    cached = tool_cache.get(cache_key)
    if cached is not None:
        logger.debug(f"[cache hit] {cache_key}")
        return cached
    cfg = await OrgConfig.find_one(OrgConfig.org_id == PydanticObjectId(org_id))
    if cfg:
        tool_cache.set(cache_key, cfg, ttl=TTL_ORG_CONFIG)
    return cfg


# ── Public tool functions ──────────────────────────────────────────────────────

async def get_inventory_levels(product_id: str) -> dict:
    """Returns stock quantity, COGS, and reorder status for a product."""
    cache_key = f"inventory:{product_id}"
    cached = tool_cache.get(cache_key)
    if cached is not None:
        logger.debug(f"[cache hit] {cache_key}")
        return cached

    product = await _get_product(product_id)
    if not product:
        return {"error": f"Product {product_id} not found"}

    stock   = product.stock_quantity
    reorder = product.reorder_point

    if stock == 0:
        inventory_status = "out_of_stock"
    elif stock <= reorder // 2:
        inventory_status = "critical"
    elif stock <= reorder:
        inventory_status = "low"
    elif stock >= reorder * 5:
        inventory_status = "overstock"
    else:
        inventory_status = "ok"

    result = {
        "product_id": product_id,
        "stock_quantity": stock,
        "reorder_point": reorder,
        "inventory_status": inventory_status,
        "cost_basis": product.cost_basis,
        "current_price": product.current_price,
        "gross_margin_pct": round(
            (product.current_price - product.cost_basis) / product.current_price, 4
        ) if product.current_price else 0.0,
    }

    tool_cache.set(cache_key, result, ttl=TTL_PRODUCT)
    return result


async def get_org_margin_floor(org_id: str) -> dict:
    """Returns the org's configured minimum gross margin percentage."""
    cache_key = f"org_margin:{org_id}"
    cached = tool_cache.get(cache_key)
    if cached is not None:
        logger.debug(f"[cache hit] {cache_key}")
        return cached

    cfg = await _get_org_config(org_id)
    floor = cfg.global_margin_floor_pct if cfg else 0.15

    result = {"org_id": org_id, "global_margin_floor_pct": floor}
    tool_cache.set(cache_key, result, ttl=TTL_ORG_MARGIN)
    return result


async def get_org_config(org_id: str) -> dict:
    """Returns full org pricing configuration for PricingStrategyAgent."""
    cache_key = f"org_config:{org_id}"
    cached = tool_cache.get(cache_key)
    if cached is not None:
        logger.debug(f"[cache hit] {cache_key}")
        return cached

    cfg = await _get_org_config(org_id)
    if not cfg:
        result = {
            "auto_apply_threshold": 0.90,
            "human_review_threshold": 0.70,
            "reject_below_threshold": 0.50,
            "max_price_increase_pct": 0.20,
            "max_price_decrease_pct": 0.15,
            "global_margin_floor_pct": 0.15,
            "require_dual_approval": False,
        }
    else:
        result = {
            "auto_apply_threshold": cfg.auto_apply_threshold,
            "human_review_threshold": cfg.human_review_threshold,
            "reject_below_threshold": cfg.reject_below_threshold,
            "max_price_increase_pct": cfg.max_price_increase_pct,
            "max_price_decrease_pct": cfg.max_price_decrease_pct,
            "global_margin_floor_pct": cfg.global_margin_floor_pct,
            "require_dual_approval": cfg.require_dual_approval,
        }

    tool_cache.set(cache_key, result, ttl=TTL_ORG_CONFIG)
    return result


async def check_price_bounds(product_id: str, recommended_price: float) -> dict:
    """
    Checks if recommended_price is within product.min_price and product.max_price.
    Returns the clipped price (recommendation snapped to bounds if violated).
    Product lookup uses the shared cache — no extra DB round-trip if already fetched.
    """
    product = await _get_product(product_id)
    if not product:
        return {"error": f"Product {product_id} not found"}

    clipped   = recommended_price
    violation = None

    if recommended_price < product.min_price:
        clipped   = product.min_price
        violation = f"Below min_price floor of {product.min_price}"
    elif product.max_price and recommended_price > product.max_price:
        clipped   = product.max_price
        violation = f"Above max_price ceiling of {product.max_price}"

    return {
        "product_id": product_id,
        "recommended_price": recommended_price,
        "min_price": product.min_price,
        "max_price": product.max_price,
        "pass": violation is None,
        "clipped_price": clipped,
        "violation": violation,
    }


async def check_margin_floor(
    product_id: str, org_id: str, recommended_price: float
) -> dict:
    """
    Checks if recommended_price preserves the org's gross margin floor.
    min_viable_price is the lowest price that still meets the floor.
    Both product and org config use shared cache.
    """
    product = await _get_product(product_id)
    cfg     = await _get_org_config(org_id)

    if not product:
        return {"error": f"Product {product_id} not found"}

    floor_pct = cfg.global_margin_floor_pct if cfg else 0.15
    cost      = product.cost_basis

    min_viable = round(cost / (1 - floor_pct), 2) if floor_pct < 1.0 else cost
    current_margin = round(
        (recommended_price - cost) / recommended_price, 4
    ) if recommended_price > 0 else 0.0

    return {
        "product_id": product_id,
        "recommended_price": recommended_price,
        "cost_basis": cost,
        "margin_floor_pct": floor_pct,
        "current_margin_pct": current_margin,
        "min_viable_price": min_viable,
        "pass": current_margin >= floor_pct,
    }


async def check_rate_of_change(
    product_id: str, org_id: str, recommended_price: float
) -> dict:
    """
    Checks if the price change exceeds org's configured max increase/decrease caps.
    Both product and org config use shared cache.
    """
    product = await _get_product(product_id)
    cfg     = await _get_org_config(org_id)

    if not product:
        return {"error": f"Product {product_id} not found"}

    max_up   = cfg.max_price_increase_pct if cfg else 0.20
    max_down = cfg.max_price_decrease_pct if cfg else 0.15
    current  = product.current_price

    max_allowed = round(current * (1 + max_up),   2)
    min_allowed = round(current * (1 - max_down),  2)
    change_pct  = round((recommended_price - current) / current, 4) if current else 0.0
    passed      = min_allowed <= recommended_price <= max_allowed

    return {
        "product_id": product_id,
        "current_price": current,
        "recommended_price": recommended_price,
        "change_pct": change_pct,
        "max_increase_pct": max_up,
        "max_decrease_pct": max_down,
        "max_allowed_price": max_allowed,
        "min_allowed_price": min_allowed,
        "pass": passed,
        "violation": None if passed else (
            f"Increase of {change_pct:.1%} exceeds cap of {max_up:.1%}"
            if change_pct > 0 else
            f"Decrease of {abs(change_pct):.1%} exceeds cap of {max_down:.1%}"
        ),
    }
