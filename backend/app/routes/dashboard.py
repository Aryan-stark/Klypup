"""
routes/dashboard.py — Aggregated KPIs and activity feed for the dashboard home.
"""
from fastapi import APIRouter, Depends

from app.controllers import dashboard_controller
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/kpis")
async def get_kpis(current_user=Depends(get_current_user)):
    return await dashboard_controller.get_kpis(current_user)


@router.get("/activity")
async def get_activity(current_user=Depends(get_current_user)):
    return await dashboard_controller.get_activity(current_user)
