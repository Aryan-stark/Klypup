"""
services/recommendation_service.py — Recommendation list, detail, and approval workflow.

Responsibilities:
  - Query and filter recommendations (tenant-scoped)
  - Approve: record decision, call ecommerce_api, update product price, audit
  - Reject: record decision with reason, audit
  - Modify: analyst overrides AI price, approve at new price, audit

Status transition rules enforced here:
  pending     → approved → applied  (approve / modify)
  pending     → rejected            (reject)
  escalated   → approved → applied  (second approver uses same approve endpoint)
  escalated   → rejected            (second approver)
  auto_approved is set by the orchestrator — not a valid input state here
"""
from datetime import datetime, timezone

from beanie import PydanticObjectId
from beanie.operators import In
from fastapi import HTTPException, status

from app.models.pricing_recommendation import PricingRecommendation, RecommendationStatus
from app.models.product import Product
from app.services import audit_service
from app.tools import ecommerce_api
from app.utils.logger import get_logger
from app.utils.pagination import paginate, skip_limit

logger = get_logger(__name__)

# Statuses an analyst can act on (auto_approved / applied / rejected are terminal)
_ACTIONABLE = {RecommendationStatus.PENDING, RecommendationStatus.ESCALATED}


# ─── Internal helpers ────────────────────────────────────────

def _serialize(rec: PricingRecommendation, product: Product | None,
               include_reasoning: bool = False) -> dict:
    """
    Converts a PricingRecommendation to an API-safe dict.

    include_reasoning=False → list view (omits agent_reasoning for smaller payloads)
    include_reasoning=True  → detail view (includes full embedded agent reasoning)
    """
    base = {
        "id": str(rec.id),
        "run_id": str(rec.run_id),
        "product_id": str(rec.product_id),
        "product_name": product.name if product else None,
        "product_sku": product.sku if product else None,
        "current_price": rec.current_price,
        "recommended_price": rec.recommended_price,
        "price_change_pct": rec.price_change_pct,
        "confidence_score": rec.confidence_score,
        "strategy_label": rec.strategy_label,
        "rationale_summary": rec.rationale_summary,
        "status": rec.status.value,
        "reviewed_by": str(rec.reviewed_by) if rec.reviewed_by else None,
        "reviewed_at": rec.reviewed_at.isoformat() if rec.reviewed_at else None,
        "review_note": rec.review_note,
        "applied_at": rec.applied_at.isoformat() if rec.applied_at else None,
        "created_at": rec.created_at.isoformat(),
    }

    if include_reasoning:
        base["agent_reasoning"] = [
            {
                "agent_name": a.agent_name,
                "narrative": a.narrative,
                "output_signal": a.output_signal,
                "confidence_contrib": a.confidence_contrib,
                "execution_ms": a.execution_ms,
                "tool_calls": [
                    {
                        "tool_name": t.tool_name,
                        "arguments": t.arguments,
                        "result": t.result,
                        "execution_ms": t.execution_ms,
                    }
                    for t in a.tool_calls
                ],
            }
            for a in rec.agent_reasoning
        ]

    return base


async def _get_verified_rec(
    org_id: PydanticObjectId, rec_id: str
) -> PricingRecommendation:
    """Load a recommendation and verify it belongs to this org. Always 404 on miss."""
    try:
        rec = await PricingRecommendation.get(rec_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Recommendation not found")
    if not rec or rec.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Recommendation not found")
    return rec


async def _apply_to_platform(rec: PricingRecommendation, price: float) -> None:
    """
    Calls the e-commerce platform API and updates Product.current_price.
    Raises HTTP 502 if the platform call fails.

    Why update the product here and not in ecommerce_api.py?
      ecommerce_api is a mock tool — it should not import our models.
      recommendation_service owns the workflow and is the right place
      to coordinate the DB write that follows a successful platform call.
    """
    result = await ecommerce_api.apply_price_change(str(rec.product_id), price)

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Platform API failed: {result.get('error', 'unknown error')}",
        )

    # Mirror the price change in our own product catalog
    product = await Product.get(rec.product_id)
    if product:
        product.current_price = price
        product.updated_at = datetime.now(timezone.utc)
        await product.save()


# ─── Public service functions ────────────────────────────────

async def list_recommendations(
    org_id: PydanticObjectId,
    status_filter: str | None,
    run_id: str | None,
    product_id: str | None,
    confidence_min: float | None,
    page: int,
    per_page: int,
) -> dict:
    """
    Returns a paginated recommendations list for this org.
    Enriches each entry with product name + SKU (one batch query, not N queries).
    """
    conditions = [PricingRecommendation.org_id == org_id]

    if status_filter:
        try:
            conditions.append(
                PricingRecommendation.status == RecommendationStatus(status_filter)
            )
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Unknown status: {status_filter}")

    if run_id:
        try:
            conditions.append(PricingRecommendation.run_id == PydanticObjectId(run_id))
        except Exception:
            pass  # Invalid ObjectId — no results will match

    if product_id:
        try:
            conditions.append(
                PricingRecommendation.product_id == PydanticObjectId(product_id)
            )
        except Exception:
            pass

    if confidence_min is not None:
        conditions.append(PricingRecommendation.confidence_score >= confidence_min)

    query = PricingRecommendation.find(*conditions).sort("-created_at")
    total = await query.count()

    skip, limit = skip_limit(page, per_page)
    recs = await query.skip(skip).limit(limit).to_list()

    # Batch-fetch products for name + SKU display
    product_ids = list({r.product_id for r in recs})
    product_map: dict = {}
    if product_ids:
        products = await Product.find(In(Product.id, product_ids)).to_list()
        product_map = {p.id: p for p in products}

    items = [_serialize(r, product_map.get(r.product_id)) for r in recs]
    return paginate(items, total, page, per_page)


async def get_recommendation(org_id: PydanticObjectId, rec_id: str) -> dict:
    """
    Returns full recommendation including all 5 agents' embedded reasoning.
    This is the main payload for the Recommendation Detail page.
    One MongoDB fetch = complete page — no secondary queries for agent data.
    """
    rec = await _get_verified_rec(org_id, rec_id)

    product = await Product.get(rec.product_id)
    return _serialize(rec, product, include_reasoning=True)


async def approve(
    org_id: PydanticObjectId,
    rec_id: str,
    user_id: PydanticObjectId,
    note: str,
) -> dict:
    """
    Analyst (or second approver for escalated) approves the AI's recommended price.

    Flow:
      1. Verify rec is in an actionable state (pending / escalated)
      2. Push price to platform  ← raises 502 if this fails (no DB changes yet)
      3. Update product.current_price
      4. Mark recommendation APPLIED
      5. Write two audit entries: decision + price change
    """
    rec = await _get_verified_rec(org_id, rec_id)

    if rec.status not in _ACTIONABLE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Recommendation is already {rec.status.value} — cannot approve.",
        )

    old_price = rec.current_price
    new_price = rec.recommended_price

    # Call platform first — if it fails we don't touch the DB
    await _apply_to_platform(rec, new_price)

    now = datetime.now(timezone.utc)
    rec.status = RecommendationStatus.APPLIED
    rec.reviewed_by = user_id
    rec.reviewed_at = now
    rec.review_note = note or None
    rec.applied_at = now
    await rec.save()

    logger.info(f"[approve] rec={rec_id} price {old_price}→{new_price} user={user_id}")

    # Audit: one entry for the human decision, one for the price change
    await audit_service.log(
        org_id=org_id,
        action="recommendation_approved",
        product_id=rec.product_id,
        recommendation_id=rec.id,
        actor_id=user_id,
        metadata={"note": note},
    )
    await audit_service.log(
        org_id=org_id,
        action="price_updated",
        product_id=rec.product_id,
        recommendation_id=rec.id,
        actor_id=user_id,
        old_value={"price": old_price},
        new_value={"price": new_price},
    )

    product = await Product.get(rec.product_id)
    return _serialize(rec, product, include_reasoning=False)


async def reject(
    org_id: PydanticObjectId,
    rec_id: str,
    user_id: PydanticObjectId,
    reason: str,
    note: str,
) -> dict:
    """
    Analyst rejects the recommendation — price stays unchanged.
    Reason is required and stored in both rec.review_note and the audit entry.
    """
    rec = await _get_verified_rec(org_id, rec_id)

    if rec.status not in _ACTIONABLE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Recommendation is already {rec.status.value} — cannot reject.",
        )

    now = datetime.now(timezone.utc)
    rec.status = RecommendationStatus.REJECTED
    rec.reviewed_by = user_id
    rec.reviewed_at = now
    rec.review_note = f"{reason}: {note}".strip(": ") if note else reason
    await rec.save()

    logger.info(f"[reject] rec={rec_id} reason='{reason}' user={user_id}")

    await audit_service.log(
        org_id=org_id,
        action="recommendation_rejected",
        product_id=rec.product_id,
        recommendation_id=rec.id,
        actor_id=user_id,
        metadata={"reason": reason, "note": note},
    )

    product = await Product.get(rec.product_id)
    return _serialize(rec, product, include_reasoning=False)


async def modify(
    org_id: PydanticObjectId,
    rec_id: str,
    user_id: PydanticObjectId,
    override_price: float,
    note: str,
) -> dict:
    """
    Analyst disagrees with the AI price and sets their own before approving.

    The override_price replaces recommended_price on the doc so the UI always shows
    what was actually applied. The AI's original price is preserved in the audit log.

    Validates override_price against the product's min_price/max_price bounds —
    the same hard limits the execution compliance agent checks.
    """
    rec = await _get_verified_rec(org_id, rec_id)

    if rec.status not in _ACTIONABLE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Recommendation is already {rec.status.value} — cannot modify.",
        )

    # Load product to validate price bounds
    product = await Product.get(rec.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Associated product not found")

    if override_price < product.min_price:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Override price ${override_price} is below product floor ${product.min_price}.",
        )
    if product.max_price and override_price > product.max_price:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Override price ${override_price} exceeds product ceiling ${product.max_price}.",
        )

    old_price = rec.current_price
    ai_price = rec.recommended_price  # preserve for audit log

    # Push to platform before touching the DB
    await _apply_to_platform(rec, override_price)

    now = datetime.now(timezone.utc)
    rec.recommended_price = override_price
    rec.price_change_pct = round(
        (override_price - old_price) / old_price, 4
    ) if old_price else 0.0
    rec.status = RecommendationStatus.APPLIED
    rec.reviewed_by = user_id
    rec.reviewed_at = now
    rec.review_note = note or None
    rec.applied_at = now
    await rec.save()

    logger.info(
        f"[modify] rec={rec_id} AI price={ai_price} override={override_price} user={user_id}"
    )

    await audit_service.log(
        org_id=org_id,
        action="recommendation_approved",
        product_id=rec.product_id,
        recommendation_id=rec.id,
        actor_id=user_id,
        metadata={
            "type": "analyst_override",
            "ai_recommended_price": ai_price,
            "override_price": override_price,
            "note": note,
        },
    )
    await audit_service.log(
        org_id=org_id,
        action="price_updated",
        product_id=rec.product_id,
        recommendation_id=rec.id,
        actor_id=user_id,
        old_value={"price": old_price},
        new_value={"price": override_price},
    )

    # product.current_price was updated inside _apply_to_platform; re-fetch for serialization
    product = await Product.get(rec.product_id)
    return _serialize(rec, product, include_reasoning=False)
