from datetime import datetime, timezone

from beanie import Document, PydanticObjectId
from pydantic import Field


class Product(Document):
    org_id: PydanticObjectId

    sku: str
    name: str
    description: str = ""
    category: str
    subcategory: str = ""
    brand: str = ""

    # Pricing
    current_price: float
    cost_basis: float                  # COGS
    msrp: float | None = None
    min_price: float                   # absolute floor (never go below)
    max_price: float | None = None     # absolute ceiling

    # Inventory
    stock_quantity: int = 0
    reorder_point: int = 10

    tags: list[str] = []
    is_active: bool = True

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "products"
        indexes = [
            [("org_id", 1), ("sku", 1)],   # compound unique
            [("org_id", 1), ("category", 1)],
            [("org_id", 1), ("is_active", 1)],
        ]
