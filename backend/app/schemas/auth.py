"""
auth.py — Request/response shapes for authentication endpoints.

Why separate from models/user.py?
  - models/user.py  = what's stored in MongoDB (includes password_hash)
  - schemas/auth.py = what the API accepts/returns (never exposes password_hash)

Connected to: routes/auth.py, controllers/auth_controller.py
"""
from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    org_name: str          # creates a new organization on signup


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    """Safe user representation — no password_hash exposed."""
    id: str
    org_id: str
    email: str
    full_name: str
    role: str
