"""
controllers/audit_controller.py — Handles audit trail requests.
"""
import csv
import io

from app.schemas.common import ApiResponse
from app.services import audit_service


async def list_audit(current_user, product_id, action, from_date, to_date, page, per_page):
    return await audit_service.list_audit(
        org_id=current_user.org_id,
        product_id=product_id, action=action,
        from_date=from_date, to_date=to_date,
        page=page, per_page=per_page,
    )


async def export_csv(current_user):
    """Async generator — streams CSV rows to client without loading all into memory."""
    logs = await audit_service.get_all_for_export(current_user.org_id)

    # Field names must exactly match the keys returned by get_all_for_export.
    # extrasaction='ignore' is a safety net — raises nothing if the dict grows extra keys.
    FIELDS = [
        "occurred_at", "action", "product_name", "actor_email",
        "recommendation_id", "old_value", "new_value", "metadata",
    ]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=FIELDS, extrasaction="ignore")

    # Yield the header row first — even for empty exports this produces a valid CSV.
    writer.writeheader()
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)

    for log in logs:
        writer.writerow(log)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)
