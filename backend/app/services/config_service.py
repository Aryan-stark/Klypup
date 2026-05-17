"""
services/config_service.py — Org configuration (thresholds, margins, escalation rules).
"""
from datetime import datetime, timezone

from beanie import PydanticObjectId

from app.models.org_config import OrgConfig
from app.schemas.config import OrgConfigUpdate
from app.services import audit_service
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _serialize(cfg: OrgConfig) -> dict:
    return {
        "auto_apply_threshold": cfg.auto_apply_threshold,
        "human_review_threshold": cfg.human_review_threshold,
        "reject_below_threshold": cfg.reject_below_threshold,
        "max_price_increase_pct": cfg.max_price_increase_pct,
        "max_price_decrease_pct": cfg.max_price_decrease_pct,
        "global_margin_floor_pct": cfg.global_margin_floor_pct,
        "escalation_email": cfg.escalation_email,
        "require_dual_approval": cfg.require_dual_approval,
        "updated_at": cfg.updated_at.isoformat(),
        "updated_by": str(cfg.updated_by) if cfg.updated_by else None,
    }


async def get_config(org_id: PydanticObjectId) -> dict:
    """Fetch config; create with safe defaults if this org has no config yet."""
    cfg = await OrgConfig.find_one(OrgConfig.org_id == org_id)
    if not cfg:
        cfg = OrgConfig(org_id=org_id)
        await cfg.insert()
    return _serialize(cfg)


async def update_config(
    org_id: PydanticObjectId,
    updates: OrgConfigUpdate,
    updated_by: PydanticObjectId,
) -> dict:
    cfg = await OrgConfig.find_one(OrgConfig.org_id == org_id)
    if not cfg:
        cfg = OrgConfig(org_id=org_id)
        await cfg.insert()

    old_snapshot = _serialize(cfg)

    changed_fields = updates.model_dump(exclude_none=True)
    for field, value in changed_fields.items():
        setattr(cfg, field, value)
    cfg.updated_at = datetime.now(timezone.utc)
    cfg.updated_by = updated_by
    await cfg.save()

    logger.info(f"[config] updated fields={list(changed_fields.keys())} org={org_id}")

    await audit_service.log(
        org_id=org_id,
        action="config_changed",
        actor_id=updated_by,
        old_value=old_snapshot,
        new_value=_serialize(cfg),
        metadata={"changed_fields": list(changed_fields.keys())},
    )
    return _serialize(cfg)


async def reset_config(org_id: PydanticObjectId, updated_by: PydanticObjectId) -> dict:
    """Overwrite with factory defaults."""
    cfg = await OrgConfig.find_one(OrgConfig.org_id == org_id)
    old_snapshot = _serialize(cfg) if cfg else {}

    if cfg:
        await cfg.delete()

    fresh = OrgConfig(org_id=org_id, updated_by=updated_by)
    await fresh.insert()

    await audit_service.log(
        org_id=org_id,
        action="config_changed",
        actor_id=updated_by,
        old_value=old_snapshot,
        new_value=_serialize(fresh),
        metadata={"reset": True},
    )
    logger.info(f"[config] reset to defaults org={org_id}")
    return _serialize(fresh)
