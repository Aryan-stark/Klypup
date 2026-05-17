"""
services/product_service.py — Product catalog business logic.

Responsibilities:
  - CRUD for products (scoped to org_id — tenant isolation enforced here)
  - Filtering, sorting, searching the catalog
  - Computing derived fields: margin_pct, inventory_status
  - Price change history (from audit_log)

Tenant isolation rule: every query starts with `Product.org_id == org_id`.
No product from another org can ever appear in results.
"""
import re
from datetime import datetime, timezone

from beanie import PydanticObjectId
from beanie.operators import In, Or, RegEx
from fastapi import HTTPException, status

from app.models.audit_log import AuditLog
from app.models.pricing_recommendation import PricingRecommendation
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductFilters, ProductUpdate
from app.utils.logger import get_logger
from app.utils.pagination import paginate, skip_limit

logger = get_logger(__name__)


# ─── Internal helpers ────────────────────────────────────────

def _serialize(product: Product, latest_rec_status: str | None = None) -> dict:
    """Converts a Product document → API-safe dict with all computed fields."""
    return {
        "id": str(product.id),
        "org_id": str(product.org_id),
        "sku": product.sku,
        "name": product.name,
        "description": product.description,
        "category": product.category,
        "subcategory": product.subcategory,
        "brand": product.brand,
        "current_price": product.current_price,
        "cost_basis": product.cost_basis,
        "msrp": product.msrp,
        "min_price": product.min_price,
        "max_price": product.max_price,
        "margin_pct": compute_margin_pct(product.current_price, product.cost_basis),
        "stock_quantity": product.stock_quantity,
        "reorder_point": product.reorder_point,
        "inventory_status": compute_inventory_status(
            product.stock_quantity, product.reorder_point
        ),
        "tags": product.tags,
        "is_active": product.is_active,
        "created_at": product.created_at.isoformat(),
        "updated_at": product.updated_at.isoformat(),
        "latest_recommendation_status": latest_rec_status,
    }


async def _get_verified_product(org_id: PydanticObjectId, product_id: str) -> Product:
    """
    Fetch a product and verify org ownership in one place.
    Used by get, update, and delete to avoid repeating the same guard.
    Always raises 404 (never 403) — we don't reveal whether a product exists
    in a different org.
    """
    try:
        product = await Product.get(product_id)
    except Exception:
        # Invalid ObjectId format → treat as not found
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Product not found")
    if not product or product.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Product not found")
    return product


# ─── Public service functions ────────────────────────────────

async def list_products(org_id: PydanticObjectId, filters: ProductFilters) -> dict:
    """
    Returns a paginated product list scoped to this org.

    Design notes:
      - Text search uses regex (no Atlas Search needed for a demo catalog).
      - margin_pct is computed in Python — sorting by "margin" uses current_price
        as a proxy (higher price ≈ higher absolute margin for same-cost products).
        True margin sort would require a materialized field or in-memory sort.
      - Latest recommendation status is batch-fetched in one query (not N queries).
    """
    # 1. Build filter conditions
    conditions = [
        Product.org_id == org_id,
        Product.is_active == filters.is_active,
    ]

    if filters.category:
        conditions.append(Product.category == filters.category)

    if filters.search:
        # Case-insensitive substring match on name OR SKU
        pattern = re.escape(filters.search)
        conditions.append(
            Or(
                RegEx(Product.name, pattern, "i"),
                RegEx(Product.sku, pattern, "i"),
            )
        )

    query = Product.find(*conditions)

    # 2. Sort — margin sorts by current_price as documented proxy
    sort_field = {
        "name": "name",
        "price": "current_price",
        "margin": "current_price",
        "stock": "stock_quantity",
    }.get(filters.sort_by, "name")
    direction = "+" if filters.sort_order == "asc" else "-"
    query = query.sort(f"{direction}{sort_field}")

    # 3. Total count before slicing (needed so frontend can calculate total pages)
    total = await query.count()

    # 4. Paginate
    skip, limit = skip_limit(filters.page, filters.per_page)
    products = await query.skip(skip).limit(limit).to_list()

    # 5. Batch-fetch latest recommendation status for this page's products.
    #    One DB round-trip instead of len(products) round-trips.
    latest_rec_map: dict = {}
    if products:
        product_ids = [p.id for p in products]
        recs = await PricingRecommendation.find(
            PricingRecommendation.org_id == org_id,
            In(PricingRecommendation.product_id, product_ids),
        ).sort("-created_at").to_list()

        # Descending by created_at → first occurrence per product_id = most recent
        for rec in recs:
            if rec.product_id not in latest_rec_map:
                latest_rec_map[rec.product_id] = rec.status.value

    # 6. Serialize with computed + lookup fields
    items = [_serialize(p, latest_rec_map.get(p.id)) for p in products]
    return paginate(items, total, filters.page, filters.per_page)


async def get_product(org_id: PydanticObjectId, product_id: str) -> dict:
    """Fetch one product by ID. Raises 404 if not found or belongs to a different org."""
    product = await _get_verified_product(org_id, product_id)

    # Latest recommendation status for the detail page sidebar
    rec = await PricingRecommendation.find(
        PricingRecommendation.org_id == org_id,
        PricingRecommendation.product_id == product.id,
    ).sort("-created_at").first_or_none()

    latest_status = rec.status.value if rec else None
    return _serialize(product, latest_status)


async def get_price_history(org_id: PydanticObjectId, product_id: str) -> list:
    """
    Returns audit log entries for this product where action = "price_updated".
    Used by the Product Detail page's price history chart.
    """
    try:
        pid = PydanticObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Product not found")

    entries = await AuditLog.find(
        AuditLog.org_id == org_id,
        AuditLog.product_id == pid,
        AuditLog.action == "price_updated",
    ).sort("-occurred_at").to_list()

    return [
        {
            "id": str(e.id),
            "actor_id": str(e.actor_id) if e.actor_id else None,
            "old_value": e.old_value,
            "new_value": e.new_value,
            "metadata": e.metadata,
            "occurred_at": e.occurred_at.isoformat(),
        }
        for e in entries
    ]


async def create_product(org_id: PydanticObjectId, body: ProductCreate) -> dict:
    """
    Adds a product to the org's catalog.
    SKU must be unique within the org (the DB index enforces this too,
    but we check first to return a readable 409 instead of a Beanie error).
    """
    existing = await Product.find_one(
        Product.org_id == org_id,
        Product.sku == body.sku,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"SKU '{body.sku}' already exists in this org.",
        )

    product = Product(org_id=org_id, **body.model_dump())
    await product.insert()
    logger.info(f"[create_product] SKU={product.sku} id={product.id} org={org_id}")
    return _serialize(product)


async def update_product(
    org_id: PydanticObjectId,
    product_id: str,
    body: ProductUpdate,
) -> dict:
    """
    Partial update — only the fields present in the request body are changed.
    exclude_none=True means omitted fields are untouched (true PATCH semantics).
    """
    product = await _get_verified_product(org_id, product_id)

    updates = body.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(product, field, value)
    product.updated_at = datetime.now(timezone.utc)

    await product.save()
    logger.info(f"[update_product] id={product_id} fields={list(updates.keys())} org={org_id}")
    return _serialize(product)


async def delete_product(org_id: PydanticObjectId, product_id: str) -> None:
    """
    Soft delete — sets is_active=False instead of removing the document.

    Why soft delete?
      Pricing recommendations and audit logs reference this product_id.
      A hard delete would orphan those records and break the history view.
      Soft-deleted products are excluded from list_products (is_active=True default)
      but remain queryable for historical context.
    """
    product = await _get_verified_product(org_id, product_id)
    product.is_active = False
    product.updated_at = datetime.now(timezone.utc)
    await product.save()
    logger.info(f"[delete_product] Soft-deleted id={product_id} org={org_id}")


# ─── Pure computation helpers (no DB) ────────────────────────

def compute_margin_pct(current_price: float, cost_basis: float) -> float:
    """(price - cost) / price — simple gross margin percentage."""
    if current_price == 0:
        return 0.0
    return round((current_price - cost_basis) / current_price, 4)


def compute_inventory_status(stock: int, reorder_point: int) -> str:
    """Returns human-readable inventory status label."""
    if stock == 0:
        return "out_of_stock"
    if stock <= reorder_point // 2:
        return "critical"
    if stock <= reorder_point:
        return "low"
    if stock >= reorder_point * 5:
        return "overstock"
    return "ok"
