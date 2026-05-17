"""
services/auth_service.py — Authentication business logic.

Responsibilities:
  - Create user + org on signup
  - Validate credentials on login
  - Issue and rotate JWT tokens
  - Invalidate refresh tokens on logout

This layer has no knowledge of HTTP requests/responses.
It only works with Python objects and MongoDB.

Key decisions:
  - Email is globally unique (enforced here, not just per-org index)
  - Refresh token stored as bcrypt hash on the User doc (no revocation store needed)
  - Token rotation: every refresh issues a new refresh token and invalidates the old one
"""
import re
from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.models.organization import Organization
from app.models.org_config import OrgConfig
from app.models.user import User, UserRole
from app.schemas.auth import SignupRequest, TokenResponse
from app.utils import hashing
from app.utils import jwt as jwt_utils
from app.utils.logger import get_logger

logger = get_logger(__name__)


# ─── Internal helpers ────────────────────────────────────────

def _slugify(name: str) -> str:
    """
    Converts an org name to a URL-safe slug.
    'Acme Corp!' → 'acme-corp'

    Used to generate a unique org identifier that is safe to use in URLs.
    """
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)     # remove special chars except hyphen
    slug = re.sub(r"[\s_]+", "-", slug)       # spaces/underscores → hyphen
    slug = re.sub(r"-+", "-", slug)           # collapse multiple hyphens
    return slug.strip("-")


def _build_token_response(user: User) -> TokenResponse:
    """
    Issues a fresh access token + refresh token for a user.
    Stores the hashed refresh token on the user document (caller must save).
    """
    access_token = jwt_utils.create_access_token(
        user_id=str(user.id),
        org_id=str(user.org_id),
        role=user.role.value,
    )
    refresh_token = jwt_utils.create_refresh_token(user_id=str(user.id))

    # Store hash so we can validate / invalidate later
    user.refresh_token_hash = hashing.hash_password(refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


# ─── Public service functions ────────────────────────────────

async def signup(body: SignupRequest) -> dict:
    """
    Creates a new Organization and Admin user in a single operation.
    Every signup creates one new isolated tenant (org).

    Returns a dict with tokens + user info — the controller wraps it
    in ApiResponse before sending to the client.
    """
    # 1. Enforce global email uniqueness
    #    The DB index is (org_id, email) — unique per org — but login
    #    only knows email, not org_id. We prevent duplicates globally here.
    existing = await User.find_one(User.email == body.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # 2. Generate a unique org slug
    #    If "Acme Corp" is taken, try "acme-corp-1", "acme-corp-2", etc.
    base_slug = _slugify(body.org_name)
    slug = base_slug
    counter = 1
    while await Organization.find_one(Organization.slug == slug):
        slug = f"{base_slug}-{counter}"
        counter += 1

    # 3. Create Organization (the tenant record)
    org = Organization(name=body.org_name, slug=slug)
    await org.insert()
    logger.info(f"[signup] Created org '{org.name}' id={org.id}")

    # 4. Create OrgConfig with safe defaults
    #    Every org gets its own config so admins can tune thresholds independently.
    org_config = OrgConfig(org_id=org.id)
    await org_config.insert()

    # 5. Create the first user — always Admin role
    #    Admins can invite Pricing Analysts later via /users/invite
    user = User(
        org_id=org.id,
        email=body.email,
        password_hash=hashing.hash_password(body.password),
        full_name=body.full_name,
        role=UserRole.ADMIN,
    )
    await user.insert()
    logger.info(f"[signup] Created admin user '{user.email}' for org '{org.name}'")

    # 6. Issue tokens and store refresh token hash
    tokens = _build_token_response(user)
    await user.save()

    return {
        "access_token": tokens.access_token,
        "refresh_token": tokens.refresh_token,
        "token_type": tokens.token_type,
        "user": {
            "id": str(user.id),
            "org_id": str(org.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
        },
    }


async def login(email: str, password: str) -> TokenResponse | None:
    """
    Validates credentials and returns tokens.

    Returns None (not an exception) if credentials are wrong.
    The controller is responsible for turning None into a 401 response.
    Why? Services should not know about HTTP status codes.
    """
    # 1. Find user by email (global search — email is unique across all orgs)
    user = await User.find_one(User.email == email)

    # Return None for both "user not found" and "wrong password"
    # — same response prevents email enumeration attacks
    if not user or not user.is_active:
        return None

    if not hashing.verify_password(password, user.password_hash):
        logger.warning(f"[login] Failed password attempt for '{email}'")
        return None

    # 2. Update last login timestamp
    user.last_login_at = datetime.now(timezone.utc)

    # 3. Issue tokens (also sets user.refresh_token_hash)
    tokens = _build_token_response(user)
    await user.save()

    logger.info(f"[login] User '{user.email}' logged in (org={user.org_id})")
    return tokens


async def logout(refresh_token: str) -> None:
    """
    Invalidates the refresh token by clearing the stored hash.

    Access tokens (15 min) expire naturally — no action needed.
    Refresh tokens (7 days) are invalidated here immediately.

    We do NOT raise on invalid tokens — logout should always succeed
    from the user's perspective even if the token is already expired.
    """
    payload = jwt_utils.decode_refresh_token(refresh_token)
    if not payload:
        return  # Already expired or invalid — nothing to do

    user = await User.get(payload["sub"])
    if user and user.refresh_token_hash:
        user.refresh_token_hash = None
        await user.save()
        logger.info(f"[logout] Cleared refresh token for user id={user.id}")


async def refresh_access_token(refresh_token: str) -> TokenResponse | None:
    """
    Issues a new access token (and rotates the refresh token).

    Token rotation means every call to this function:
      - Issues a new access token
      - Issues a new refresh token
      - Invalidates the old refresh token

    Why rotate? If an attacker steals a refresh token and uses it first,
    the legitimate user's next refresh will fail — they get logged out
    and know something is wrong.
    """
    # 1. Validate token structure and expiry
    payload = jwt_utils.decode_refresh_token(refresh_token)
    if not payload:
        return None

    # 2. Load user
    user = await User.get(payload["sub"])
    if not user or not user.is_active:
        return None

    # 3. Validate the token matches what we stored
    #    If user logged out (hash = None) or used a stale token, reject.
    if not user.refresh_token_hash:
        return None
    if not hashing.verify_password(refresh_token, user.refresh_token_hash):
        logger.warning(f"[refresh] Stale refresh token rejected for user id={user.id}")
        return None

    # 4. Rotate — issue new tokens, invalidate old refresh token
    tokens = _build_token_response(user)   # sets new hash
    await user.save()

    return tokens
