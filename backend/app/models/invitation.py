"""
models/invitation.py — Single-use invite token for joining an org.

An admin creates an Invitation (via POST /users/invitations).
The token is shared with the invitee as a link: /join?token=<token>.
When the invitee submits the join form, the token is consumed (accepted_at is set)
and a new User is created in the same org with the specified role.

Fields:
  token       — cryptographically random URL-safe string (secrets.token_urlsafe(32))
  email       — pre-set by the admin; pre-fills the join form and becomes the user's login
  role        — role the new user will have (set by admin at invite time)
  org_id      — the org the new user will join
  invited_by  — admin who created the invite (for audit trail)
  expires_at  — 7 days from creation; after this the token is invalid
  accepted_at — set when the invitee completes registration; None = still pending
"""
from datetime import datetime, timezone

from beanie import Document, PydanticObjectId
from pydantic import EmailStr, Field
from pymongo import ASCENDING, IndexModel

from app.models.user import UserRole


class Invitation(Document):
    org_id: PydanticObjectId
    email: EmailStr
    role: UserRole = UserRole.PRICING_ANALYST
    token: str
    invited_by: PydanticObjectId
    expires_at: datetime
    accepted_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "invitations"
        indexes = [
            IndexModel([("token", ASCENDING)], unique=True),
            IndexModel([("org_id", ASCENDING), ("email", ASCENDING)]),
        ]
