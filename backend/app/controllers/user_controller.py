"""
controllers/user_controller.py — User management within an org.
"""
from app.schemas.common import ApiResponse
from app.schemas.user import InviteUserRequest, UpdateUserRequest
from app.services import user_service


async def list_users(current_user):
    users = await user_service.list_users(current_user.org_id)
    return ApiResponse(data=users)


async def invite_user(current_user, body: InviteUserRequest):
    user = await user_service.invite_user(current_user.org_id, body.model_dump())
    return ApiResponse(data=user, message="User invited")


async def update_user(current_user, user_id: str, body: UpdateUserRequest):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    user = await user_service.update_user(current_user.org_id, user_id, updates)
    return ApiResponse(data=user, message="User updated")
