"""
routes/products.py — Product catalog endpoints.

Includes: list (with filter/sort/search), get one, create, update, soft-delete,
price history per product.
"""
from fastapi import APIRouter, Depends, Query

from app.controllers import product_controller
from app.dependencies import get_current_user, require_admin
from app.schemas.product import ProductCreate, ProductFilters, ProductUpdate

router = APIRouter()


@router.get("")
async def list_products(
    category: str | None = Query(None),
    search: str | None = Query(None),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    filters = ProductFilters(category=category, search=search,
                             sort_by=sort_by, sort_order=sort_order,
                             page=page, per_page=per_page)
    return await product_controller.list_products(current_user, filters)


@router.get("/{product_id}")
async def get_product(product_id: str, current_user=Depends(get_current_user)):
    return await product_controller.get_product(current_user, product_id)


@router.get("/{product_id}/history")
async def get_price_history(product_id: str, current_user=Depends(get_current_user)):
    return await product_controller.get_price_history(current_user, product_id)


@router.post("")
async def create_product(body: ProductCreate, current_user=Depends(require_admin)):
    return await product_controller.create_product(current_user, body)


@router.patch("/{product_id}")
async def update_product(product_id: str, body: ProductUpdate,
                         current_user=Depends(require_admin)):
    return await product_controller.update_product(current_user, product_id, body)


@router.delete("/{product_id}")
async def delete_product(product_id: str, current_user=Depends(require_admin)):
    return await product_controller.delete_product(current_user, product_id)
