"""
utils/jwt.py — JWT token creation and decoding.

Access tokens: short-lived (15 min), contain user_id + org_id + role
Refresh tokens: long-lived (7 days), contain only user_id

Why org_id and role in the access token?
  The dependencies.py get_current_user() needs org_id for every request.
  Storing it in the token avoids a DB lookup on every request.
  If a user's role changes, the old token remains valid until it expires (15 min).
  Acceptable trade-off for this scope.
"""
from datetime import datetime, timezone, timedelta

from jose import JWTError, jwt

from app.config import settings


def create_access_token(user_id: str, org_id: str, role: str) -> str:
    """Creates a 15-minute access token with user identity claims."""
    payload = {
        "sub": user_id,
        "org_id": org_id,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Creates a 7-day refresh token. Contains only user_id — minimal claims."""
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        ),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """
    Decodes and validates an access token.
    Returns the payload dict, or None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET,
                             algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> dict | None:
    """Decodes and validates a refresh token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET,
                             algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None
