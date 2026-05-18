"""
services/config_service.py — Org configuration (thresholds, margins, escalation, AI).
"""
import time
from datetime import datetime, timezone

from beanie import PydanticObjectId

from app.models.org_config import OrgConfig
from app.schemas.config import OrgConfigUpdate, AIConfigUpdate
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


# ── AI Configuration ──────────────────────────────────────────────────────────

def _mask_key(key: str) -> str:
    """Return a safe preview like sk-***...abc (first 4 + last 4 chars)."""
    if len(key) <= 8:
        return "***"
    return f"{key[:4]}{'*' * min(len(key) - 8, 12)}{key[-4:]}"


async def get_ai_config(org_id: PydanticObjectId) -> dict:
    """
    Internal use only — returns the raw API key.
    Called by orchestrator and verify endpoint; never serialised directly to HTTP response.
    """
    cfg = await OrgConfig.find_one(OrgConfig.org_id == org_id)
    if not cfg:
        return {"ai_provider": None, "ai_model": None, "ai_api_key": None}
    return {
        "ai_provider": cfg.ai_provider,
        "ai_model": cfg.ai_model,
        "ai_api_key": cfg.ai_api_key,
    }


async def get_ai_config_public(org_id: PydanticObjectId) -> dict:
    """Safe for HTTP responses — key is masked."""
    raw = await get_ai_config(org_id)
    key = raw["ai_api_key"]
    return {
        "ai_provider": raw["ai_provider"],
        "ai_model": raw["ai_model"],
        "ai_key_set": bool(key),
        "ai_key_preview": _mask_key(key) if key else None,
    }


async def update_ai_config(
    org_id: PydanticObjectId,
    updates: AIConfigUpdate,
    updated_by: PydanticObjectId,
) -> dict:
    cfg = await OrgConfig.find_one(OrgConfig.org_id == org_id)
    if not cfg:
        cfg = OrgConfig(org_id=org_id)
        await cfg.insert()

    changed: list[str] = []
    if updates.ai_provider is not None:
        cfg.ai_provider = updates.ai_provider
        changed.append("ai_provider")
    if updates.ai_model is not None:
        cfg.ai_model = updates.ai_model
        changed.append("ai_model")
    if updates.ai_api_key is not None:
        cfg.ai_api_key = updates.ai_api_key
        changed.append("ai_api_key")

    if changed:
        cfg.updated_at = datetime.now(timezone.utc)
        cfg.updated_by = updated_by
        await cfg.save()
        logger.info(f"[config] AI config updated fields={changed} org={org_id}")
        await audit_service.log(
            org_id=org_id,
            action="config_changed",
            actor_id=updated_by,
            metadata={"changed_fields": changed, "section": "ai_config"},
        )

    return await get_ai_config_public(org_id)


async def verify_ai_config(
    org_id: PydanticObjectId,
    *,
    ai_provider: str | None = None,
    ai_model: str | None = None,
    ai_api_key: str | None = None,
) -> dict:
    """
    Make a real test call to the AI provider.
    Uses request-supplied values first; falls back to stored config.
    Returns {ok, message, latency_ms}.
    """
    from app.utils.ai_client import make_ai_client, get_default_model

    stored = await get_ai_config(org_id)
    provider = ai_provider or stored["ai_provider"]
    model    = ai_model    or stored["ai_model"]
    key      = ai_api_key  or stored["ai_api_key"]

    if not provider:
        return {"ok": False, "message": "No provider selected.", "latency_ms": None}
    if not model:
        model = get_default_model(provider)
    if not key:
        return {"ok": False, "message": "No API key configured for this provider.", "latency_ms": None}

    try:
        client = make_ai_client(provider, key)
    except ValueError as exc:
        return {"ok": False, "message": str(exc), "latency_ms": None}

    start = time.monotonic()
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Reply with the single word OK."}],
            max_tokens=5,
        )
        latency_ms = int((time.monotonic() - start) * 1000)
        reply = (response.choices[0].message.content or "").strip()
        logger.info(f"[config] AI verify ok provider={provider} model={model} latency={latency_ms}ms reply={reply!r}")
        return {
            "ok": True,
            "message": f"Connected. {provider.title()} / {model} responded in {latency_ms} ms.",
            "latency_ms": latency_ms,
        }
    except Exception as exc:
        latency_ms = int((time.monotonic() - start) * 1000)
        err = str(exc)[:300]
        logger.warning(f"[config] AI verify failed provider={provider} model={model}: {err}")
        return {"ok": False, "message": err, "latency_ms": latency_ms}
