"""
controllers/product_controller.py — Handles product catalog HTTP requests.
"""
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.product import ProductCreate, ProductFilters, ProductUpdate
from app.services import product_service


async def list_products(current_user, filters: ProductFilters):
    result = await product_service.list_products(current_user.org_id, filters)
    return result  # PaginatedResponse returned directly from service


async def get_product(current_user, product_id: str):
    product = await product_service.get_product(current_user.org_id, product_id)
    return ApiResponse(data=product)


async def get_price_history(current_user, product_id: str):
    history = await product_service.get_price_history(current_user.org_id, product_id)
    return ApiResponse(data=history)


async def create_product(current_user, body: ProductCreate):
    product = await product_service.create_product(current_user.org_id, body)
    return ApiResponse(data=product, message="Product created")


async def update_product(current_user, product_id: str, body: ProductUpdate):
    product = await product_service.update_product(current_user.org_id, product_id, body)
    return ApiResponse(data=product, message="Product updated")


async def delete_product(current_user, product_id: str):
    await product_service.delete_product(current_user.org_id, product_id)
    return ApiResponse(data=None, message="Product deleted")
