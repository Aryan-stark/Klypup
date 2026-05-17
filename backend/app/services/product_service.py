"""
services/product_service.py — Product catalog business logic.

Responsibilities:
  - CRUD for products (scoped to org_id — tenant isolation enforced here)
  - Filtering, sorting, searching the catalog
  - Computing derived fields: margin_pct, inventory_status
  - Price change history (from audit_log)
"""
from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductFilters, ProductUpdate


async def list_products(org_id: PydanticObjectId, filters: ProductFilters) -> dict:
    """
    Returns paginated product list. All queries are scoped to org_id.
    Never returns products belonging to a different org.
    """
    # TODO: implement
    # 1. Build MongoDB query: org_id + is_active + category filter + text search
    # 2. Apply sort (name | price | margin | stock)
    # 3. Paginate with skip/limit
    # 4. For each product, compute margin_pct and inventory_status
    # 5. Look up latest recommendation status per product
    # 6. Return PaginatedResponse
    pass


async def get_product(org_id: PydanticObjectId, product_id: str) -> dict:
    """Fetch one product. Raises 404 if not found or belongs to different org."""
    # TODO: implement
    pass


async def get_price_history(org_id: PydanticObjectId, product_id: str) -> list:
    """Returns audit log entries for this product filtered to price_updated actions."""
    # TODO: implement
    pass


async def create_product(org_id: PydanticObjectId, body: ProductCreate) -> dict:
    # TODO: implement — check SKU uniqueness within org, insert doc
    pass


async def update_product(org_id: PydanticObjectId, product_id: str,
                         body: ProductUpdate) -> dict:
    # TODO: implement — fetch, verify org_id matches, apply updates, save
    pass


async def delete_product(org_id: PydanticObjectId, product_id: str) -> None:
    """Soft delete — sets is_active=False, does not remove from DB."""
    # TODO: implement
    pass


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
