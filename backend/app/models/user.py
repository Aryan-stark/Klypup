from datetime import datetime, timezone
from enum import Enum

from beanie import Document, PydanticObjectId
from pydantic import EmailStr, Field


class UserRole(str, Enum):
    ADMIN = "admin"
    PRICING_ANALYST = "pricing_analyst"


class User(Document):
    org_id: PydanticObjectId
    email: EmailStr
    password_hash: str
    full_name: str
    role: UserRole = UserRole.PRICING_ANALYST
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login_at: datetime | None = None

    class Settings:
        name = "users"
        indexes = [
            [("org_id", 1), ("email", 1)],  # compound unique
        ]
