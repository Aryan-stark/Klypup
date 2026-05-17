"""
controllers/config_controller.py — Admin config panel requests.
"""
from app.schemas.common import ApiResponse
from app.schemas.config import OrgConfigUpdate
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
