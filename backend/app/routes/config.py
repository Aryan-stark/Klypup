"""
routes/config.py — Admin configuration panel.
All endpoints require the `admin` role.
"""
from fastapi import APIRouter, Depends

from app.controllers import config_controller
from app.dependencies import require_admin
from app.schemas.config import OrgConfigUpdate, AIConfigUpdate, AIVerifyRequest

router = APIRouter()


@router.get("")
async def get_config(current_user=Depends(require_admin)):
    return await config_controller.get_config(current_user)


@router.put("")
async def update_config(body: OrgConfigUpdate, current_user=Depends(require_admin)):
    return await config_controller.update_config(current_user, body)


@router.post("/reset")
async def reset_config(current_user=Depends(require_admin)):
    return await config_controller.reset_config(current_user)


# ── AI Configuration ──────────────────────────────────────────────────────────

@router.get("/ai")
async def get_ai_config(current_user=Depends(require_admin)):
    return await config_controller.get_ai_config(current_user)


@router.put("/ai")
async def update_ai_config(body: AIConfigUpdate, current_user=Depends(require_admin)):
    return await config_controller.update_ai_config(current_user, body)


@router.post("/ai/verify")
async def verify_ai_config(body: AIVerifyRequest, current_user=Depends(require_admin)):
    return await config_controller.verify_ai_config(current_user, body)
