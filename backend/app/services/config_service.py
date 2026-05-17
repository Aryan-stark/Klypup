"""
services/config_service.py — Org configuration (thresholds, margins, escalation rules).
"""
from beanie import PydanticObjectId

from app.models.org_config import OrgConfig
from app.schemas.config import OrgConfigUpdate
from app.services import audit_service


async def get_config(org_id: PydanticObjectId) -> dict:
    # TODO: implement — fetch OrgConfig by org_id, create defaults if not exists
    pass


async def update_config(org_id: PydanticObjectId, updates: OrgConfigUpdate,
                        updated_by: PydanticObjectId) -> dict:
    """
    Updates thresholds. Writes audit entry so there's a record of who changed what.
    """
    # TODO: implement
    # 1. Fetch current config
    # 2. Apply non-None fields from updates
    # 3. Save
    # 4. audit_service.log(action="config_changed", old_value=old, new_value=new)
    pass


async def reset_config(org_id: PydanticObjectId, updated_by: PydanticObjectId) -> dict:
    # TODO: implement — overwrite with OrgConfig defaults
    pass
