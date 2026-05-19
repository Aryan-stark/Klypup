"""
services/user_service.py — User management within an org.
"""
import secrets
from datetime import datetime, timedelta, timezone

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models.invitation import Invitation
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.utils import hashing
from app.utils import jwt as jwt_utils
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


# ── Invitation flow ──────────────────────────────────────────────────────────

def _serialize_invite(invite: Invitation, org: Organization | None) -> dict:
    return {
        "token": invite.token,
        "email": invite.email,
        "role": invite.role.value,
        "org_name": org.name if org else None,
        "expires_at": invite.expires_at.isoformat(),
        "accepted_at": invite.accepted_at.isoformat() if invite.accepted_at else None,
        "created_at": invite.created_at.isoformat(),
    }


async def create_invite(
    org_id: PydanticObjectId,
    invited_by_id: PydanticObjectId,
    email: str,
    role: str,
) -> dict:
    """
    Admin creates a single-use invite token for a given email address.

    If a pending (not yet accepted, not yet expired) invite for this email already
    exists in the org, the existing one is returned — idempotent so accidental
    double-clicks don't create duplicate tokens.
    """
    # Reject if a full user account already exists for this email
    existing_user = await User.find_one(User.email == email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    # If a still-valid invite exists, reuse it
    now = datetime.now(timezone.utc)
    existing = await Invitation.find_one(
        Invitation.org_id == org_id,
        Invitation.email == email,
        Invitation.accepted_at == None,  # noqa: E711
        Invitation.expires_at > now,
    )
    org = await Organization.get(org_id)
    if existing:
        return _serialize_invite(existing, org)

    token = secrets.token_urlsafe(32)
    invite = Invitation(
        org_id=org_id,
        email=email,
        role=UserRole(role),
        token=token,
        invited_by=invited_by_id,
        expires_at=now + timedelta(days=7),
    )
    await invite.insert()
    logger.info(f"[create_invite] email={email} role={role} org={org_id}")
    return _serialize_invite(invite, org)


async def get_invite(token: str) -> dict:
    """
    Public endpoint — returns invite metadata so the /join page can show
    org name, pre-fill email, and display the role.
    Does NOT reveal secret fields.
    """
    invite = await Invitation.find_one(Invitation.token == token)
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Invitation not found.")
    if invite.accepted_at:
        raise HTTPException(status_code=status.HTTP_410_GONE,
                            detail="This invitation has already been used.")
    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_410_GONE,
                            detail="This invitation has expired.")

    org = await Organization.get(invite.org_id)
    return _serialize_invite(invite, org)


async def accept_invite(token: str, full_name: str, password: str) -> dict:
    """
    Public endpoint — validates the token, creates the user, marks the token used,
    and returns JWT tokens so the invitee is immediately logged in.
    """
    invite = await Invitation.find_one(Invitation.token == token)
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Invitation not found.")
    if invite.accepted_at:
        raise HTTPException(status_code=status.HTTP_410_GONE,
                            detail="This invitation has already been used.")
    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_410_GONE,
                            detail="This invitation has expired.")

    # Double-check no race condition created a duplicate user
    existing = await User.find_one(User.email == invite.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="An account with this email already exists.")

    # Create the user
    user = User(
        org_id=invite.org_id,
        email=invite.email,
        full_name=full_name,
        password_hash=hashing.hash_password(password),
        role=invite.role,
    )
    await user.insert()

    # Consume the token — mark accepted so it cannot be reused
    invite.accepted_at = datetime.now(timezone.utc)
    await invite.save()

    logger.info(
        f"[accept_invite] email={user.email} role={user.role.value} org={user.org_id}"
    )

    # Issue JWT tokens — invitee is immediately logged in
    access_token = jwt_utils.create_access_token(
        user_id=str(user.id),
        org_id=str(user.org_id),
        role=user.role.value,
    )
    refresh_token = jwt_utils.create_refresh_token(user_id=str(user.id))
    user.refresh_token_hash = hashing.hash_password(refresh_token)
    await user.save()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "org_id": str(user.org_id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
        },
    }


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
