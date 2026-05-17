from datetime import datetime, timezone

from beanie import Document, PydanticObjectId
from pydantic import Field


class CompetitorPrice(Document):
    org_id: PydanticObjectId
    product_id: PydanticObjectId

    competitor_name: str
    price: float
    currency: str = "USD"
    in_stock: bool = True
    scraped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "competitor_prices"
        indexes = [
            [("org_id", 1), ("product_id", 1), ("scraped_at", -1)],
            [("product_id", 1), ("competitor_name", 1), ("scraped_at", -1)],
        ]
