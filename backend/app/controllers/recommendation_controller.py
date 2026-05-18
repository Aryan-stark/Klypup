"""
controllers/recommendation_controller.py — Handles recommendation + approval workflow requests.
"""
from app.schemas.common import ApiResponse
from app.schemas.recommendation import ApproveRequest, ModifyRequest, RejectRequest
from app.services import recommendation_service


async def list_recommendations(current_user, status, run_id, product_id,
                                confidence_min, page, per_page):
    return await recommendation_service.list_recommendations(
        org_id=current_user.org_id,
        status_filter=status, run_id=run_id, product_id=product_id,
        confidence_min=confidence_min, page=page, per_page=per_page,
    )


async def get_recommendation(current_user, rec_id: str):
    rec = await recommendation_service.get_recommendation(current_user.org_id, rec_id)
    return ApiResponse(data=rec)


async def approve(current_user, rec_id: str, body: ApproveRequest):
    rec = await recommendation_service.approve(
        org_id=current_user.org_id, rec_id=rec_id,
        user_id=current_user.id, note=body.note,
    )
    return ApiResponse(data=rec, message="Recommendation approved")


async def reject(current_user, rec_id: str, body: RejectRequest):
    rec = await recommendation_service.reject(
        org_id=current_user.org_id, rec_id=rec_id,
        user_id=current_user.id, reason=body.reason, note=body.note,
    )
    return ApiResponse(data=rec, message="Recommendation rejected")


async def modify(current_user, rec_id: str, body: ModifyRequest):
    rec = await recommendation_service.modify(
        org_id=current_user.org_id, rec_id=rec_id,
        user_id=current_user.id, override_price=body.override_price, note=body.note,
    )
    return ApiResponse(data=rec, message="Price override applied")
