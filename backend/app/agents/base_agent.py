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
import json
import time
from abc import ABC, abstractmethod

from groq import AsyncGroq

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# One shared Groq client — created once, reused by all agents
_groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)


class BaseAgent(ABC):
    name: str = "base"
    model: str = "llama-3.3-70b-versatile"

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
            response = await _groq_client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=self.tools,
                tool_choice="auto",
                response_format={"type": "json_object"},
            )
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
                output = json.loads(choice.message.content)
                output["_tool_calls"] = tool_call_traces
                output["_execution_ms"] = int((time.monotonic() - start) * 1000)
                logger.info(f"[{self.name}] completed in {output['_execution_ms']}ms")
                return output

    def _build_user_message(self, product_id: str, context: dict) -> str:
        """Formats the user message with product_id and upstream agent context."""
        return json.dumps({"product_id": product_id, "upstream_context": context})
