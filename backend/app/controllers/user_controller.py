"""
controllers/user_controller.py — User management within an org.
"""
from app.schemas.common import ApiResponse
from app.schemas.user import (
    AcceptInviteRequest,
    CreateInviteRequest,
    InviteUserRequest,
    UpdateUserRequest,
)
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


# ── Invitation flow ───────────────────────────────────────────────────────────

async def create_invite(current_user, body: CreateInviteRequest):
    invite = await user_service.create_invite(
        org_id=current_user.org_id,
        invited_by_id=current_user.id,
        email=body.email,
        role=body.role,
    )
    return ApiResponse(data=invite, message="Invitation created")


async def get_invite(token: str):
    invite = await user_service.get_invite(token)
    return ApiResponse(data=invite)


async def accept_invite(token: str, body: AcceptInviteRequest):
    result = await user_service.accept_invite(
        token=token,
        full_name=body.full_name,
        password=body.password,
    )
    return ApiResponse(data=result, message="Account created")
