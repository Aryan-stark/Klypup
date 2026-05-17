"""
routes/auth.py — URL definitions for authentication.

This file ONLY declares what URL + method triggers which controller function.
No business logic here. No DB calls here.

Flow: Request → route → controller → service → model
"""
from fastapi import APIRouter, Depends

from app.controllers import auth_controller
from app.dependencies import get_current_user
from app.schemas.auth import LoginRequest, RefreshRequest, SignupRequest

router = APIRouter()


@router.post("/signup")
async def signup(body: SignupRequest):
    return await auth_controller.signup(body)


@router.post("/login")
async def login(body: LoginRequest):
    return await auth_controller.login(body)


@router.post("/logout")
async def logout(body: RefreshRequest):
    return await auth_controller.logout(body)


@router.post("/refresh")
async def refresh(body: RefreshRequest):
    return await auth_controller.refresh(body)


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return await auth_controller.me(current_user)
