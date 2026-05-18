"""
controllers/config_controller.py — Admin config panel requests.
"""
from app.schemas.common import ApiResponse
from app.schemas.config import OrgConfigUpdate, AIConfigUpdate, AIVerifyRequest
from app.services import config_service


async def get_config(current_user):
    config = await config_service.get_config(current_user.org_id)
    return ApiResponse(data=config)


async def update_config(current_user, body: OrgConfigUpdate):
    config = await config_service.update_config(
        org_id=current_user.org_id, updates=body, updated_by=current_user.id
    )
    return ApiResponse(data=config, message="Configuration saved")


async def reset_config(current_user):
    config = await config_service.reset_config(
        org_id=current_user.org_id, updated_by=current_user.id
    )
    return ApiResponse(data=config, message="Configuration reset to defaults")


# ── AI Configuration ──────────────────────────────────────────────────────────

async def get_ai_config(current_user):
    data = await config_service.get_ai_config_public(current_user.org_id)
    return ApiResponse(data=data)


async def update_ai_config(current_user, body: AIConfigUpdate):
    data = await config_service.update_ai_config(
        org_id=current_user.org_id, updates=body, updated_by=current_user.id
    )
    return ApiResponse(data=data, message="AI configuration saved")


async def verify_ai_config(current_user, body: AIVerifyRequest):
    result = await config_service.verify_ai_config(
        org_id=current_user.org_id,
        ai_provider=body.ai_provider,
        ai_model=body.ai_model,
        ai_api_key=body.ai_api_key,
    )
    return ApiResponse(data=result)
