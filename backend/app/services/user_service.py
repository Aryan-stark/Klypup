"""
services/user_service.py — User management within an org.
"""
from beanie import PydanticObjectId

from app.models.user import User, UserRole
from app.utils import hashing


async def list_users(org_id: PydanticObjectId) -> list:
    # TODO: implement — return all active users in org
    pass


async def invite_user(org_id: PydanticObjectId, body: dict) -> dict:
    """
    Creates a new user in the same org as the requesting admin.
    No email sending in this implementation — credentials returned directly.
    """
    # TODO: implement
    # 1. Check email not already used in this org
    # 2. Hash password
    # 3. Create User document with org_id
    # 4. Return safe user dict
    pass


async def update_user(org_id: PydanticObjectId, user_id: str, body: dict) -> dict:
    # TODO: implement — verify user belongs to org, update role / is_active
    pass
