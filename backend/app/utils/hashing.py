"""
utils/hashing.py — Password hashing with bcrypt.

Why bcrypt?
  bcrypt is slow by design (adaptive cost factor), making brute-force attacks
  impractical. Never store plain-text passwords or use fast hashes like MD5/SHA.
"""
from passlib.context import CryptContext

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Returns a bcrypt hash. Store this in the database."""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Returns True if plain_password matches the stored hash."""
    return _pwd_context.verify(plain_password, hashed_password)
