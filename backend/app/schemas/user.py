"""
schemas/user.py — Request/response shapes for user management endpoints.

Connected to: routes/users.py, controllers/user_controller.py
"""
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: str
    org_id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None


class InviteUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "pricing_analyst"   # default role for invites


class UpdateUserRequest(BaseModel):
    role: str | None = None
    is_active: bool | None = None
    full_name: str | None = None
