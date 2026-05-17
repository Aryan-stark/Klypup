from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.user import User, UserRole
from app.utils.jwt import decode_access_token

bearer_scheme = HTTPBearer()


async def _user_from_token(token: str) -> User:
    """Shared logic: validate token string → return active User."""
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user = await User.get(payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> User:
    return await _user_from_token(credentials.credentials)


async def get_sse_user(token: str = Query(...)) -> User:
    """
    Auth dependency for SSE endpoints.
    EventSource cannot send custom headers, so the token is passed as ?token=...
    """
    return await _user_from_token(token)


def require_role(*roles: UserRole):
    """Factory that returns a dependency enforcing one of the given roles."""

    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return _check


# Convenience aliases
require_admin = require_role(UserRole.ADMIN)
require_analyst = require_role(UserRole.ADMIN, UserRole.PRICING_ANALYST)
