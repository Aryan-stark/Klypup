"""
routes/runs.py — Trigger and track pricing runs.
SSE stream endpoint allows the frontend to show live progress.
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.controllers import run_controller
from app.dependencies import get_current_user
from app.schemas.run import RunCreate

router = APIRouter()


@router.post("")
async def trigger_run(body: RunCreate, current_user=Depends(get_current_user)):
    return await run_controller.trigger_run(current_user, body)


@router.get("")
async def list_runs(current_user=Depends(get_current_user)):
    return await run_controller.list_runs(current_user)


@router.get("/{run_id}")
async def get_run(run_id: str, current_user=Depends(get_current_user)):
    return await run_controller.get_run(current_user, run_id)


@router.get("/{run_id}/stream")
async def stream_run(run_id: str, current_user=Depends(get_current_user)):
    """Server-Sent Events — frontend receives live progress updates."""
    return StreamingResponse(
        run_controller.stream_run_progress(current_user, run_id),
        media_type="text/event-stream",
    )
