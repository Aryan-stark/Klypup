"""
routes/users.py — User management within an org.

Protected (require_admin):
  GET    /users                          — list org members
  POST   /users/invite                   — legacy: create user with a password directly
  POST   /users/invitations              — create a single-use invite token
  PATCH  /users/{user_id}               — update role / active status

Public (no auth — used by the /join page):
  GET    /users/invitations/{token}      — get invite metadata (org name, email, role)
  POST   /users/invitations/{token}/accept — complete registration, returns JWT tokens
"""
from fastapi import APIRouter, Depends

from app.controllers import user_controller
from app.dependencies import require_admin
from app.schemas.user import (
    AcceptInviteRequest,
    CreateInviteRequest,
    InviteUserRequest,
    UpdateUserRequest,
)

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


# ── Invitation flow ───────────────────────────────────────────────────────────

@router.post("/invitations")
async def create_invite(body: CreateInviteRequest, current_user=Depends(require_admin)):
    """Admin creates an invite token for a given email + role."""
    return await user_controller.create_invite(current_user, body)


@router.get("/invitations/{token}")
async def get_invite(token: str):
    """Public — /join page calls this to show org name and pre-fill email."""
    return await user_controller.get_invite(token)


@router.post("/invitations/{token}/accept")
async def accept_invite(token: str, body: AcceptInviteRequest):
    """Public — invitee submits full_name + password, gets back JWT tokens."""
    return await user_controller.accept_invite(token, body)
