from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.models.organization import Organization
from app.models.user import User
from app.models.org_config import OrgConfig
from app.models.product import Product
from app.models.competitor_price import CompetitorPrice
from app.models.demand_signal import DemandSignal
from app.models.pricing_run import PricingRun
from app.models.pricing_recommendation import PricingRecommendation
from app.models.audit_log import AuditLog
from app.models.invitation import Invitation


async def init_db() -> None:
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[
            Organization,
            User,
            OrgConfig,
            Product,
            CompetitorPrice,
            DemandSignal,
            PricingRun,
            PricingRecommendation,
            AuditLog,
            Invitation,
        ],
    )
