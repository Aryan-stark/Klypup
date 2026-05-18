"""
routes/audit.py — Audit trail: filterable, searchable, exportable.
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.controllers import audit_controller
from app.dependencies import get_current_user

router = APIRouter()


@router.get("")
async def list_audit(
    product_id: str | None = Query(None),
    action: str | None = Query(None),
    from_date: str | None = Query(None),
    to_date: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user=Depends(get_current_user),
):
    return await audit_controller.list_audit(
        current_user, product_id, action, from_date, to_date, page, per_page
    )


@router.get("/export")
async def export_audit(current_user=Depends(get_current_user)):
    """Returns a CSV file of the full audit log for the current org."""
    return StreamingResponse(
        audit_controller.export_csv(current_user),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_log.csv"},
    )
