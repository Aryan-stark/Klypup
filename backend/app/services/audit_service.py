"""
services/audit_service.py — Audit trail writes and reads.

Every price change, approval, rejection, and config change creates an audit entry.
This service is called BY other services — not directly by controllers.

The audit log is immutable — entries are only ever inserted, never updated or deleted.
"""
from datetime import datetime, timezone
from beanie import PydanticObjectId

from app.models.audit_log import AuditLog


async def log(
    org_id: PydanticObjectId,
    action: str,
    product_id: PydanticObjectId | None = None,
    recommendation_id: PydanticObjectId | None = None,
    actor_id: PydanticObjectId | None = None,
    old_value: dict | None = None,
    new_value: dict | None = None,
    metadata: dict | None = None,
) -> None:
    """
    Insert one immutable audit log entry.
    Called internally by recommendation_service, config_service, etc.
    Never called from controllers.
    """
    # TODO: implement — create and insert AuditLog document
    pass


async def list_audit(org_id, product_id, action, from_date, to_date, page, per_page) -> dict:
    # TODO: implement — query with filters, paginate, join product name + actor name
    pass


async def get_all_for_export(org_id: PydanticObjectId) -> list:
    # TODO: implement — return all logs as flat dicts for CSV export
    pass
