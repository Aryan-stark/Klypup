"""
services/auth_service.py — Authentication business logic.

Responsibilities:
  - Create user + org on signup
  - Validate credentials on login
  - Issue / validate / revoke JWT tokens
  - Password hashing

This layer has no knowledge of HTTP requests/responses.
It only works with Python objects and MongoDB.
"""
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.models.org_config import OrgConfig
from app.schemas.auth import SignupRequest, TokenResponse
from app.utils import hashing, jwt as jwt_utils


async def signup(body: SignupRequest) -> dict:
    """
    Creates a new Organization and Admin user together.
    Every signup creates a new isolated tenant.
    """
    # TODO: implement
    # 1. Check email not already in use
    # 2. Create Organization document
    # 3. Create OrgConfig with defaults
    # 4. Hash password
    # 5. Create User with role=admin
    # 6. Return tokens
    pass


async def login(email: str, password: str) -> TokenResponse | None:
    """
    Finds user by email within any org, verifies password, returns tokens.
    Returns None if credentials are wrong (controller raises 401).
    """
    # TODO: implement
    # 1. Find user by email
    # 2. Verify password hash
    # 3. Update last_login_at
    # 4. Create access token (15 min) + refresh token (7 days)
    # 5. Return TokenResponse
    pass


async def logout(refresh_token: str) -> None:
    """
    Invalidates the refresh token so it can't be used again.
    Access token expires naturally (15 min).
    """
    # TODO: implement (store revoked tokens in a small collection or just validate exp)
    pass


async def refresh_token(refresh_token: str) -> TokenResponse | None:
    """Issues a new access token from a valid refresh token."""
    # TODO: implement
    pass
