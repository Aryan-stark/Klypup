"""
routes/users.py — User management within an org (Admin only).
"""
from fastapi import APIRouter, Depends

from app.controllers import user_controller
from app.dependencies import require_admin
from app.schemas.user import InviteUserRequest, UpdateUserRequest

router = APIRouter()


@router.get("")
async def list_users(current_user=Depends(require_admin)):
    return await user_controller.list_users(current_user)


@router.post("/invite")
async def invite_user(body: InviteUserRequest, current_user=Depends(require_admin)):
    return await user_controller.invite_user(current_user, body)


@router.patch("/{user_id}")
async def update_user(user_id: str, body: UpdateUserRequest,
                      current_user=Depends(require_admin)):
    return await user_controller.update_user(current_user, user_id, body)
