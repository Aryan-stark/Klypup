"""
services/user_service.py — User management within an org.
"""
from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models.user import User, UserRole
from app.utils import hashing
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _serialize(user: User) -> dict:
    return {
        "id": str(user.id),
        "org_id": str(user.org_id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat(),
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
    }


async def list_users(org_id: PydanticObjectId) -> list:
    users = await User.find(
        User.org_id == org_id,
        User.is_active == True,
    ).sort("full_name").to_list()
    return [_serialize(u) for u in users]


async def invite_user(org_id: PydanticObjectId, body: dict) -> dict:
    """
    Creates a new user inside the requesting admin's org.
    No email flow — credentials are returned directly (demo behaviour).
    """
    existing = await User.find_one(User.org_id == org_id, User.email == body["email"])
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists in your org.",
        )

    role = UserRole(body.get("role", UserRole.PRICING_ANALYST.value))
    user = User(
        org_id=org_id,
        email=body["email"],
        full_name=body.get("full_name", ""),
        password_hash=hashing.hash_password(body["password"]),
        role=role,
    )
    await user.insert()
    logger.info(f"[invite_user] email={user.email} role={role.value} org={org_id}")
    return _serialize(user)


async def update_user(org_id: PydanticObjectId, user_id: str, body: dict) -> dict:
    try:
        user = await User.get(user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user or user.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if "role" in body:
        user.role = UserRole(body["role"])
    if "is_active" in body:
        user.is_active = body["is_active"]
    if "full_name" in body:
        user.full_name = body["full_name"]

    await user.save()
    logger.info(f"[update_user] id={user_id} fields={list(body.keys())} org={org_id}")
    return _serialize(user)
