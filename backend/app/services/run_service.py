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
import json
from datetime import datetime, timezone

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models.org_config import OrgConfig
from app.models.pricing_run import PricingRun, RunStatus, RunTrigger
from app.models.product import Product
from app.services import audit_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

# In-memory queues for SSE. Key = run_id string, Value = asyncio.Queue
# NOTE: This only works with a single backend instance.
# For multi-instance, replace with Redis pub/sub.
_run_queues: dict[str, asyncio.Queue] = {}


def _serialize_run(run: PricingRun) -> dict:
    return {
        "id": str(run.id),
        "org_id": str(run.org_id),
        "triggered_by": str(run.triggered_by) if run.triggered_by else None,
        "trigger_mode": run.trigger_mode.value,
        "status": run.status.value,
        "total_products": run.total_products,
        "products_processed": run.products_processed,
        "recommendations_generated": run.recommendations_generated,
        "product_filter": run.product_filter,
        "started_at": run.started_at.isoformat(),
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "error_message": run.error_message,
    }


async def trigger_run(
    org_id: PydanticObjectId,
    triggered_by: PydanticObjectId,
    product_filter: dict | None,
) -> dict:
    """
    Creates a PricingRun and schedules background execution.
    Returns immediately — the run executes asynchronously.
    The client polls GET /runs/{id} or streams GET /runs/{id}/stream for progress.
    """
    # 1. Resolve which products to process
    conditions = [Product.org_id == org_id, Product.is_active == True]
    if product_filter and product_filter.get("category"):
        conditions.append(Product.category == product_filter["category"])

    # Cap at 2 products per run.
    # Gemini 2.5 Flash / Cerebras: 1M TPD — plenty of headroom.
    # 2 products × 5 agents × ~10k tokens = ~100k tokens per run.
    products = await Product.find(*conditions).limit(2).to_list()
    if not products:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No active products found matching the filter.",
        )

    # 2. Create the run document
    run = PricingRun(
        org_id=org_id,
        triggered_by=triggered_by,
        trigger_mode=RunTrigger.MANUAL,
        status=RunStatus.RUNNING,
        product_filter=product_filter,
        total_products=len(products),
    )
    await run.insert()

    # 3. Create SSE queue before spawning the task (avoids a race condition
    #    where the client connects to the stream before the queue exists)
    _run_queues[str(run.id)] = asyncio.Queue()

    # 4. Load org config for the orchestrator routing thresholds
    org_config = await OrgConfig.find_one(OrgConfig.org_id == org_id)
    config_dict = {
        "auto_apply_threshold": org_config.auto_apply_threshold if org_config else 0.90,
        "human_review_threshold": org_config.human_review_threshold if org_config else 0.70,
        "global_margin_floor_pct": org_config.global_margin_floor_pct if org_config else 0.15,
    }

    # 5. Audit: log the run trigger
    await audit_service.log(
        org_id=org_id,
        action="run_triggered",
        actor_id=triggered_by,
        metadata={"run_id": str(run.id), "total_products": len(products)},
    )

    # 6. Schedule background execution (asyncio.create_task not BackgroundTasks
    #    so the SSE stream can yield events while this task runs concurrently)
    product_ids = [p.id for p in products]
    asyncio.create_task(
        _execute_run(str(run.id), org_id, product_ids, config_dict),
        name=f"run-{run.id}",
    )

    logger.info(f"[trigger_run] run={run.id} products={len(products)} org={org_id}")
    return _serialize_run(run)


async def _execute_run(
    run_id: str,
    org_id: PydanticObjectId,
    product_ids: list,
    org_config: dict,
) -> None:
    """
    Background task: runs the 5-agent pipeline for each product in sequence.
    Updates the run document after each product and pushes SSE events.

    Import is deferred to avoid a circular import:
      run_service ← orchestrator ← run_service (push_event)
    """
    # Deferred import to break the circular dependency
    from app.agents.orchestrator import run_for_product  # noqa: PLC0415

    run = await PricingRun.get(run_id)
    recs_generated = 0

    try:
        for i, pid in enumerate(product_ids):
            rec = await run_for_product(str(pid), org_id, run_id, org_config)

            run.products_processed += 1
            if rec:
                recs_generated += 1
            await run.save()

            await push_event(run_id, {
                "event": "progress",
                "products_processed": run.products_processed,
                "total_products": run.total_products,
                "product_id": str(pid),
                "recommendation_generated": rec is not None,
            })

            # Groq free tier: 30 req/min for llama-3.3-70b.
            # Each product = 5 agent calls (agents 1,2,4 use 70b; 3,5 use 8b-instant).
            # A 2-second pause keeps throughput under the limit with headroom.
            if i < len(product_ids) - 1:
                await asyncio.sleep(2)

        run.status = RunStatus.COMPLETED
        run.completed_at = datetime.now(timezone.utc)
        run.recommendations_generated = recs_generated
        await run.save()

        await push_event(run_id, {
            "event": "completed",
            "products_processed": run.products_processed,
            "recommendations_generated": recs_generated,
        })
        logger.info(f"[run] {run_id} completed — {recs_generated}/{len(product_ids)} recs generated")

    except Exception as exc:
        logger.error(f"[run] {run_id} failed: {exc}")
        run = await PricingRun.get(run_id)
        run.status = RunStatus.FAILED
        run.error_message = str(exc)
        run.completed_at = datetime.now(timezone.utc)
        await run.save()

        await push_event(run_id, {"event": "failed", "error": str(exc)})


async def list_runs(org_id: PydanticObjectId) -> list:
    runs = await PricingRun.find(
        PricingRun.org_id == org_id,
    ).sort("-started_at").to_list()
    return [_serialize_run(r) for r in runs]


async def get_run(org_id: PydanticObjectId, run_id: str) -> dict:
    try:
        run = await PricingRun.get(run_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Run not found")
    if not run or run.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Run not found")
    return _serialize_run(run)


async def stream_progress(org_id: PydanticObjectId, run_id: str):
    """
    Async generator for Server-Sent Events.
    Yields JSON-encoded event strings until the run completes or fails.
    Sends a keepalive comment every 25 seconds to prevent proxy timeouts.
    """
    # Verify run belongs to this org before streaming
    run_dict = await get_run(org_id, run_id)

    # Run already finished — send terminal event and close
    if run_dict["status"] in ("completed", "failed"):
        yield f"data: {json.dumps({'event': run_dict['status'], 'run': run_dict})}\n\n"
        return

    queue = _run_queues.get(run_id)
    if not queue:
        yield f"data: {json.dumps({'event': 'error', 'detail': 'Stream unavailable'})}\n\n"
        return

    while True:
        try:
            event = await asyncio.wait_for(queue.get(), timeout=25.0)
            yield f"data: {json.dumps(event)}\n\n"
            if event.get("event") in ("completed", "failed"):
                _run_queues.pop(run_id, None)
                break
        except asyncio.TimeoutError:
            yield ": keepalive\n\n"


async def push_event(run_id: str, event: dict) -> None:
    """Called by the orchestrator to push progress events into the SSE queue."""
    if run_id in _run_queues:
        await _run_queues[run_id].put(event)
