"""
routes/recommendations.py — Recommendation list, detail, and approval workflow.
"""
from fastapi import APIRouter, Depends, Query

from app.controllers import recommendation_controller
from app.dependencies import get_current_user
from app.schemas.recommendation import ApproveRequest, ModifyRequest, RejectRequest

router = APIRouter()


@router.get("")
async def list_recommendations(
    status: str | None = Query(None),
    run_id: str | None = Query(None),
    product_id: str | None = Query(None),
    confidence_min: float | None = Query(None, ge=0.0, le=1.0),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    return await recommendation_controller.list_recommendations(
        current_user, status, run_id, product_id, confidence_min, page, per_page
    )


@router.get("/{rec_id}")
async def get_recommendation(rec_id: str, current_user=Depends(get_current_user)):
    return await recommendation_controller.get_recommendation(current_user, rec_id)


@router.post("/{rec_id}/approve")
async def approve(rec_id: str, body: ApproveRequest,
                  current_user=Depends(get_current_user)):
    return await recommendation_controller.approve(current_user, rec_id, body)


@router.post("/{rec_id}/reject")
async def reject(rec_id: str, body: RejectRequest,
                 current_user=Depends(get_current_user)):
    return await recommendation_controller.reject(current_user, rec_id, body)


@router.post("/{rec_id}/modify")
async def modify(rec_id: str, body: ModifyRequest,
                 current_user=Depends(get_current_user)):
    return await recommendation_controller.modify(current_user, rec_id, body)
