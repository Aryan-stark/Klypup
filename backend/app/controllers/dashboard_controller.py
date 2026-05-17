"""
controllers/dashboard_controller.py — Dashboard KPI and activity requests.
"""
from app.schemas.common import ApiResponse
from app.services import dashboard_service


async def get_kpis(current_user):
    kpis = await dashboard_service.get_kpis(current_user.org_id)
    return ApiResponse(data=kpis)


async def get_activity(current_user):
    activity = await dashboard_service.get_activity(current_user.org_id)
    return ApiResponse(data=activity)
