"""
utils/ai_client.py — Factory for AI provider clients.

Single source of truth for provider URLs, default models, and client creation.
Imported by:
  - agents/base_agent.py (module-level fallback + per-run override)
  - services/config_service.py (verify endpoint)
  - agents/orchestrator.py (build org-specific client before pipeline starts)
"""
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── Provider registry ─────────────────────────────────────────────────────────

PROVIDERS: dict[str, dict] = {
    "cerebras": {
        "label": "Cerebras",
        "base_url": "https://api.cerebras.ai/v1/",
        "default_model": "llama3.1-8b",
        "hint": "Free tier — fastest inference (~500 tok/s)",
    },
    "gemini": {
        "label": "Google Gemini",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "default_model": "gemini-2.5-flash",
        "hint": "Free tier via Google AI Studio",
    },
    "groq": {
        "label": "Groq",
        "base_url": "https://api.groq.com/openai/v1",
        "default_model": "llama-3.3-70b-versatile",
        "hint": "Free tier — OpenAI-compatible",
    },
}


def make_ai_client(provider: str, api_key: str):
    """
    Return an AsyncOpenAI-compatible client for the given provider.
    All three providers speak the OpenAI chat-completions protocol,
    so a single client type handles them all via base_url swap.
    """
    from openai import AsyncOpenAI

    cfg = PROVIDERS.get(provider)
    if not cfg:
        raise ValueError(
            f"Unknown AI provider: {provider!r}. Must be one of {list(PROVIDERS)}"
        )
    return AsyncOpenAI(api_key=api_key, base_url=cfg["base_url"])


def get_default_model(provider: str) -> str:
    """Return the recommended default model name for a provider."""
    return PROVIDERS.get(provider, {}).get("default_model", "")


# ── Module-level env-var fallback client ──────────────────────────────────────
# Used when an org has no AI config stored in MongoDB.
# Priority: Cerebras → Gemini → Groq (matches existing .env.example guidance).

def _build_env_client():
    """
    Build a fallback (client, model, provider) triple from environment variables.
    Called once at module import. Returns (None, default_model, provider) if no key set.
    """
    from openai import AsyncOpenAI

    if settings.CEREBRAS_API_KEY:
        p = "cerebras"
        logger.info(f"AI env-fallback: Cerebras")
        client = AsyncOpenAI(
            api_key=settings.CEREBRAS_API_KEY,
            base_url=PROVIDERS[p]["base_url"],
        )
        model = settings.MODEL_NAME or PROVIDERS[p]["default_model"]
        return client, model, p

    if settings.GEMINI_API_KEY:
        p = "gemini"
        logger.info(f"AI env-fallback: Google Gemini")
        client = AsyncOpenAI(
            api_key=settings.GEMINI_API_KEY,
            base_url=PROVIDERS[p]["base_url"],
        )
        model = settings.MODEL_NAME or PROVIDERS[p]["default_model"]
        return client, model, p

    if settings.GROQ_API_KEY:
        p = "groq"
        logger.info(f"AI env-fallback: Groq")
        client = AsyncOpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url=PROVIDERS[p]["base_url"],
        )
        model = settings.MODEL_NAME or PROVIDERS[p]["default_model"]
        return client, model, p

    logger.warning(
        "No AI API key found in environment. "
        "Agent calls will fail unless the org has AI config saved in the database."
    )
    return None, PROVIDERS["cerebras"]["default_model"], "cerebras"


# Exported for use by base_agent.py
fallback_client, DEFAULT_MODEL, DEFAULT_PROVIDER = _build_env_client()
