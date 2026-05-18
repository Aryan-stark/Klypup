"""
agents/base_agent.py — Abstract base class shared by all 5 agents.

Responsibilities:
  - Holds the shared Groq client (one instance, reused across agents)
  - Implements the tool-use loop: call Groq → execute tool → continue until stop
  - Times each agent execution
  - All 5 agents inherit from this and override: system_prompt, tools, tool_map

Why a shared base?
  The tool-use loop is identical for all agents. Only the system prompt, available
  tools, and output schema differ. DRY principle — implement once here.

How the Groq tool-use loop works:
  1. Send messages + tools list to Groq API
  2. If response.finish_reason == "tool_calls":
       - Groq wants to call a Python function
       - Execute it locally (tools/ functions)
       - Append tool result to messages
       - Call Groq again with updated messages
  3. If response.finish_reason == "stop":
       - Model is done — parse its final message as JSON output
"""
import asyncio
import json
import re
import time
from abc import ABC, abstractmethod

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Provider priority: Cerebras → Gemini → Groq
# Set only ONE key in .env — whichever provider you want to use.
if settings.CEREBRAS_API_KEY:
    from openai import AsyncOpenAI
    _client = AsyncOpenAI(
        api_key=settings.CEREBRAS_API_KEY,
        base_url="https://api.cerebras.ai/v1/",
    )
    _DEFAULT_MODEL = settings.MODEL_NAME or "llama3.1-8b"
    logger.info(f"AI provider: Cerebras ({_DEFAULT_MODEL})")
elif settings.GEMINI_API_KEY:
    from openai import AsyncOpenAI
    _client = AsyncOpenAI(
        api_key=settings.GEMINI_API_KEY,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )
    _DEFAULT_MODEL = settings.MODEL_NAME or "gemini-2.5-flash"
    logger.info(f"AI provider: Google Gemini ({_DEFAULT_MODEL})")
else:
    from groq import AsyncGroq
    _client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    _DEFAULT_MODEL = settings.MODEL_NAME or "llama-3.3-70b-versatile"
    logger.info(f"AI provider: Groq ({_DEFAULT_MODEL})")

_MAX_RETRIES = 3


class BaseAgent(ABC):
    name: str = "base"
    model: str = _DEFAULT_MODEL

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """Each agent defines its own focused system prompt."""
        ...

    @property
    @abstractmethod
    def tools(self) -> list[dict]:
        """
        List of Groq-format tool definitions the agent can call.
        Format: [{"type": "function", "function": {"name": ..., "description": ..., "parameters": ...}}]
        """
        ...

    @abstractmethod
    async def execute_tool(self, tool_name: str, arguments: dict) -> dict:
        """Each agent maps tool names to the correct tools/ function."""
        ...

    async def _api_call(self, messages: list, attempt: int = 0):
        """
        Single API call with retry-on-429 logic.
        Reads the retryDelay from the error body and waits that long.
        """
        try:
            return await _client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=self.tools,
                tool_choice="auto",
            )
        except Exception as exc:
            err = str(exc)
            is_rate_limit = "429" in err or "RESOURCE_EXHAUSTED" in err
            if is_rate_limit and attempt < _MAX_RETRIES:
                # Extract suggested retry delay (e.g. 'retryDelay': '48s')
                m = re.search(r"retryDelay.*?(\d+)s", err)
                wait = int(m.group(1)) + 5 if m else 65
                logger.warning(
                    f"[{self.name}] Rate limited — waiting {wait}s "
                    f"(attempt {attempt + 1}/{_MAX_RETRIES})"
                )
                await asyncio.sleep(wait)
                return await self._api_call(messages, attempt + 1)
            raise

    async def run(self, product_id: str, context: dict) -> dict:
        """
        Main agent entry point. Runs the full tool-use loop.
        Returns structured JSON output dict.
        """
        start = time.monotonic()
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": self._build_user_message(product_id, context)},
        ]
        tool_call_traces = []

        while True:
            response = await self._api_call(messages)
            choice = response.choices[0]

            if choice.finish_reason == "tool_calls":
                messages.append(choice.message)
                for tc in choice.message.tool_calls:
                    tool_start = time.monotonic()
                    args = json.loads(tc.function.arguments)
                    result = await self.execute_tool(tc.function.name, args)
                    tool_ms = int((time.monotonic() - tool_start) * 1000)

                    tool_call_traces.append({
                        "tool_name": tc.function.name,
                        "arguments": args,
                        "result": result,
                        "execution_ms": tool_ms,
                    })
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result),
                    })
            else:
                # finish_reason == "stop" — model produced final output
                content = choice.message.content
                output = self._parse_json_output(content)
                if output is None:
                    # Model returned empty/unparseable content — ask it to retry
                    logger.warning(
                        f"[{self.name}] empty/invalid JSON response, "
                        f"asking model to produce JSON output"
                    )
                    messages.append({
                        "role": "assistant",
                        "content": content or "",
                    })
                    messages.append({
                        "role": "user",
                        "content": (
                            "Your previous response was empty or not valid JSON. "
                            "Please output ONLY a valid JSON object with the required fields. "
                            "No markdown, no explanation — just the JSON object."
                        ),
                    })
                    continue  # retry the API call with the nudge message
                output["_tool_calls"] = tool_call_traces
                output["_execution_ms"] = int((time.monotonic() - start) * 1000)
                logger.info(f"[{self.name}] completed in {output['_execution_ms']}ms")
                return output

    def _parse_json_output(self, content: str | None) -> dict | None:
        """
        Robustly extract a JSON object from the model's response.
        Returns None if no valid JSON can be found (caller will nudge and retry).
        Handles: raw JSON, ```json fences, prose with embedded JSON.
        """
        if not content or not content.strip():
            return None

        text = content.strip()

        # 1. Strip ``` fences
        if text.startswith("```"):
            parts = text.split("```")
            if len(parts) >= 2:
                inner = parts[1]
                if inner.startswith("json"):
                    inner = inner[4:]
                text = inner.strip()

        if not text:
            return None

        # 2. Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 3. Iterative JSON finder — handles model echoing tool calls before the output.
        #    The greedy regex r"\{.*\}" (DOTALL) spans multiple objects and fails.
        #    Instead: scan for every valid JSON object and return the LAST one,
        #    which is the agent's actual output (tool call echo is always first).
        decoder = json.JSONDecoder()
        pos = 0
        last_valid: dict | None = None
        while pos < len(text):
            brace = text.find("{", pos)
            if brace == -1:
                break
            try:
                obj, end_idx = decoder.raw_decode(text, brace)
                if isinstance(obj, dict):
                    last_valid = obj
                pos = end_idx
            except json.JSONDecodeError:
                pos = brace + 1
        if last_valid is not None:
            return last_valid

        logger.warning(f"[{self.name}] could not parse JSON from: {text[:200]!r}")
        return None

    def _build_user_message(self, product_id: str, context: dict) -> str:
        """Formats the user message with product_id and upstream agent context."""
        return json.dumps({"product_id": product_id, "upstream_context": context})
