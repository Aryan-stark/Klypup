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
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def init_db() -> None:
    mongo_url = settings.MONGODB_URL
    logger.info(f"Connecting to MongoDB: {mongo_url[:40]}...")
    try:
        client = AsyncIOMotorClient(mongo_url)
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
        logger.info("Beanie initialized successfully.")
    except BaseException as exc:
        logger.error(f"MongoDB init failed [{type(exc).__name__}]: {exc}")
        import sys; sys.stderr.flush()
        raise
