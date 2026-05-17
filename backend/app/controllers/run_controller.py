"""
controllers/run_controller.py — Handles pricing run trigger and status requests.
"""
from app.schemas.common import ApiResponse
from app.schemas.run import RunCreate
from app.services import run_service


async def trigger_run(current_user, body: RunCreate):
    run = await run_service.trigger_run(
        org_id=current_user.org_id,
        triggered_by=current_user.id,
        product_filter=body.product_filter,
    )
    return ApiResponse(data=run, message="Pricing run started")


async def list_runs(current_user):
    runs = await run_service.list_runs(current_user.org_id)
    return ApiResponse(data=runs)


async def get_run(current_user, run_id: str):
    run = await run_service.get_run(current_user.org_id, run_id)
    return ApiResponse(data=run)


async def stream_run_progress(current_user, run_id: str):
    """Async generator for SSE — yields progress events as the run executes."""
    async for event in run_service.stream_progress(current_user.org_id, run_id):
        yield f"data: {event}\n\n"
