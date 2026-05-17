"""
services/run_service.py — Manages pricing run lifecycle.

Responsibilities:
  - Create a PricingRun document and kick off background task
  - Track progress (products_processed counter)
  - Provide SSE progress events via asyncio.Queue
  - Update run status on completion/failure

Connected to: agents/orchestrator.py (called from background task)
"""
import asyncio
from beanie import PydanticObjectId
from fastapi import BackgroundTasks

from app.models.pricing_run import PricingRun, RunStatus, RunTrigger
from app.models.product import Product

# In-memory queues for SSE. Key = run_id string, Value = asyncio.Queue
# NOTE: This only works with a single backend instance.
# For multi-instance, replace with Redis pub/sub.
_run_queues: dict[str, asyncio.Queue] = {}


async def trigger_run(org_id: PydanticObjectId, triggered_by: PydanticObjectId,
                      product_filter: dict | None) -> dict:
    """
    Creates a PricingRun doc and queues the background execution.
    Returns immediately — the run executes asynchronously.
    """
    # TODO: implement
    # 1. Count products to process (respecting product_filter)
    # 2. Create PricingRun doc with status=running
    # 3. Create asyncio.Queue for SSE events
    # 4. Spawn background task: orchestrator.run_for_org(run_id, org_id, product_ids)
    pass


async def list_runs(org_id: PydanticObjectId) -> list:
    # TODO: implement
    pass


async def get_run(org_id: PydanticObjectId, run_id: str) -> dict:
    # TODO: implement — verify org_id, return run doc
    pass


async def stream_progress(org_id: PydanticObjectId, run_id: str):
    """
    Async generator consumed by the SSE route.
    Yields JSON-encoded event strings as the background task pushes them.
    """
    # TODO: implement
    # 1. Get or create queue for this run_id
    # 2. Loop: yield from queue until run completes
    pass


async def push_event(run_id: str, event: dict) -> None:
    """Called by the orchestrator to push progress events into the queue."""
    if run_id in _run_queues:
        await _run_queues[run_id].put(event)
