"""
services/audit_service.py — Audit trail writes and reads.

Every price change, approval, rejection, and config change creates an audit entry.
This service is called BY other services — not directly by controllers.

The audit log is immutable — entries are only ever inserted, never updated or deleted.
"""
from datetime import datetime, timezone

from beanie import PydanticObjectId
from beanie.operators import In

from app.models.audit_log import AuditLog
from app.models.product import Product
from app.models.user import User
from app.utils.logger import get_logger
from app.utils.pagination import paginate, skip_limit

logger = get_logger(__name__)


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

    Why never update/delete?
      Audit entries are evidence. If they could be edited, they'd be worthless
      as a compliance and accountability record.
    """
    entry = AuditLog(
        org_id=org_id,
        action=action,
        product_id=product_id,
        recommendation_id=recommendation_id,
        actor_id=actor_id,
        old_value=old_value,
        new_value=new_value,
        metadata=metadata,
    )
    await entry.insert()
    logger.info(
        f"[audit] action={action} product={product_id} "
        f"rec={recommendation_id} actor={actor_id}"
    )


async def list_audit(
    org_id: PydanticObjectId,
    product_id: str | None,
    action: str | None,
    from_date: datetime | None,
    to_date: datetime | None,
    page: int,
    per_page: int,
) -> dict:
    """
    Paginated, filtered audit log for one org.
    Enriches each entry with product name + actor email for the UI table.
    """
    conditions = [AuditLog.org_id == org_id]

    if product_id:
        try:
            conditions.append(AuditLog.product_id == PydanticObjectId(product_id))
        except Exception:
            pass  # Invalid ObjectId — no results will match naturally

    if action:
        conditions.append(AuditLog.action == action)

    if from_date:
        conditions.append(AuditLog.occurred_at >= from_date)

    if to_date:
        conditions.append(AuditLog.occurred_at <= to_date)

    query = AuditLog.find(*conditions).sort("-occurred_at")
    total = await query.count()

    skip, limit = skip_limit(page, per_page)
    entries = await query.skip(skip).limit(limit).to_list()

    # Batch-fetch product names and actor emails for display
    product_ids = list({e.product_id for e in entries if e.product_id})
    actor_ids = list({e.actor_id for e in entries if e.actor_id})

    product_map: dict = {}
    actor_map: dict = {}

    if product_ids:
        products = await Product.find(In(Product.id, product_ids)).to_list()
        product_map = {p.id: {"name": p.name, "sku": p.sku} for p in products}

    if actor_ids:
        actors = await User.find(In(User.id, actor_ids)).to_list()
        actor_map = {u.id: u.email for u in actors}

    items = [
        {
            "id": str(e.id),
            "action": e.action,
            "product_id": str(e.product_id) if e.product_id else None,
            "product_name": product_map.get(e.product_id, {}).get("name") if e.product_id else None,
            "product_sku": product_map.get(e.product_id, {}).get("sku") if e.product_id else None,
            "recommendation_id": str(e.recommendation_id) if e.recommendation_id else None,
            "actor_id": str(e.actor_id) if e.actor_id else None,
            "actor_email": actor_map.get(e.actor_id) if e.actor_id else None,
            "old_value": e.old_value,
            "new_value": e.new_value,
            "metadata": e.metadata,
            "occurred_at": e.occurred_at.isoformat(),
        }
        for e in entries
    ]
    return paginate(items, total, page, per_page)


async def get_all_for_export(org_id: PydanticObjectId) -> list:
    """
    Returns every audit entry for this org as flat dicts — used by /audit/export.
    Enriches each row with product name and actor email (batch-fetched) so the
    CSV is human-readable without needing to cross-reference IDs.
    """
    entries = await AuditLog.find(
        AuditLog.org_id == org_id,
    ).sort("-occurred_at").to_list()

    # Batch-fetch names so the CSV is readable without cross-referencing IDs
    product_ids = list({e.product_id for e in entries if e.product_id})
    actor_ids   = list({e.actor_id   for e in entries if e.actor_id})

    product_map: dict = {}
    actor_map: dict   = {}

    if product_ids:
        products = await Product.find(In(Product.id, product_ids)).to_list()
        product_map = {p.id: p.name for p in products}

    if actor_ids:
        actors = await User.find(In(User.id, actor_ids)).to_list()
        actor_map = {u.id: u.email for u in actors}

    return [
        {
            "occurred_at":        e.occurred_at.isoformat(),
            "action":             e.action,
            "product_name":       product_map.get(e.product_id, "") if e.product_id else "",
            "actor_email":        actor_map.get(e.actor_id, "")    if e.actor_id   else "",
            "recommendation_id":  str(e.recommendation_id) if e.recommendation_id else "",
            "old_value":          str(e.old_value  or ""),
            "new_value":          str(e.new_value  or ""),
            "metadata":           str(e.metadata   or ""),
        }
        for e in entries
    ]
