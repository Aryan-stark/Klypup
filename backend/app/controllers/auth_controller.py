"""
controllers/auth_controller.py — Handles auth HTTP requests.

Controller's job: receive parsed request objects from routes,
call the right service function, wrap result in ApiResponse, return it.

No business logic here. No DB queries here.
"""
from fastapi import HTTPException, status

from app.schemas.auth import LoginRequest, RefreshRequest, SignupRequest
from app.schemas.common import ApiResponse
from app.services import auth_service


async def signup(body: SignupRequest):
    result = await auth_service.signup(body)
    return ApiResponse(data=result, message="Account created")


async def login(body: LoginRequest):
    result = await auth_service.login(body.email, body.password)
    if not result:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid email or password")
    return ApiResponse(data=result)


async def logout(body: RefreshRequest):
    await auth_service.logout(body.refresh_token)
    return ApiResponse(data=None, message="Logged out")


async def refresh(body: RefreshRequest):
    result = await auth_service.refresh_access_token(body.refresh_token)
    if not result:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid or expired refresh token")
    return ApiResponse(data=result)


async def me(current_user):
    return ApiResponse(data={
        "id": str(current_user.id),
        "org_id": str(current_user.org_id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
    })
