"""
product.py — Request/response shapes for product catalog endpoints.

Connected to: routes/products.py, controllers/product_controller.py
"""
from pydantic import BaseModel


class ProductCreate(BaseModel):
    sku: str
    name: str
    category: str
    brand: str = ""
    current_price: float
    cost_basis: float
    min_price: float
    max_price: float | None = None
    stock_quantity: int = 0
    reorder_point: int = 10


class ProductUpdate(BaseModel):
    name: str | None = None
    current_price: float | None = None
    cost_basis: float | None = None
    min_price: float | None = None
    max_price: float | None = None
    stock_quantity: int | None = None
    is_active: bool | None = None


class ProductFilters(BaseModel):
    """Query parameters for the product list endpoint."""
    category: str | None = None
    search: str | None = None           # searches name and SKU
    is_active: bool = True
    sort_by: str = "name"               # name | price | margin | stock
    sort_order: str = "asc"
    page: int = 1
    per_page: int = 50


class ProductOut(BaseModel):
    """Product as returned by the API — includes computed fields."""
    id: str
    org_id: str
    sku: str
    name: str
    category: str
    brand: str
    current_price: float
    cost_basis: float
    margin_pct: float                   # computed: (price - cost) / price
    stock_quantity: int
    inventory_status: str               # "ok" | "low" | "critical" | "overstock"
    is_active: bool
    latest_recommendation_status: str | None  # pending | approved | etc.
