from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Reads all config from environment variables (or .env file).
    Pydantic validates types and raises on startup if required vars are missing.
    Import `settings` anywhere in the app — never use os.environ directly.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── MongoDB ────────────────────────────────────────────
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "klypup_pricing"

    # ── Groq AI ────────────────────────────────────────────
    GROQ_API_KEY: str  # required — no default, app won't start without it

    # ── JWT ────────────────────────────────────────────────
    JWT_SECRET: str    # required — long random string
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── App ────────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        """Split comma-separated CORS_ORIGINS string into a list."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


# Single shared instance — import this everywhere
settings = Settings()
