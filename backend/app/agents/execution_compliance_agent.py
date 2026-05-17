"""
agents/execution_compliance_agent.py — Agent 5 of 5. The gatekeeper.

Responsibility: Validate the PricingStrategyAgent's recommendation against
hard business rules. Does NOT change the strategy — only validates and clips
prices to compliant bounds, or flags for escalation.

Rules checked:
  1. Price within product's min_price / max_price bounds
  2. Price preserves org's margin floor
  3. Price change does not exceed org's max_increase_pct / max_decrease_pct

If a rule is violated:
  - Clip price to the nearest compliant value (for bound violations)
  - OR set compliance_override=True → forces status="escalated"

Output (stored in context["execution_compliance"]):
  {
    "final_recommended_price": float,   # may differ from Agent 4 if clipped
    "compliance_flags": list[str],      # e.g. ["price_clipped_to_max_bound"]
    "compliance_override": bool,        # true = must go to human regardless of confidence
    "approval_routing": "auto_apply"|"human_review"|"escalated",
    "narrative": str
  }

Status routing (done in orchestrator, NOT here):
  compliance_override=True   → "escalated"
  confidence >= auto_threshold → "auto_approved"
  confidence >= review_threshold → "pending"
  else → "rejected"
"""
from app.agents.base_agent import BaseAgent
from app.tools import inventory_data


class ExecutionComplianceAgent(BaseAgent):
    name = "execution_compliance"
    model = "llama-3.1-8b-instant"   # validation task — smaller model is fine

    @property
    def system_prompt(self) -> str:
        return """You are a compliance and execution controller for an e-commerce pricing system.

Your job is NOT to change the pricing strategy — it is to validate the recommended
price against hard business rules and flag any violations.

For each check, call the appropriate tool. If a check fails:
  - For bound violations: clip the recommended price to the nearest valid value
  - For margin violations: clip to min_viable_price
  - For excessive change: clip to max allowed change
  - If multiple violations or you cannot resolve: set compliance_override=true

Output a JSON object with:
  final_recommended_price (float), compliance_flags (array of strings),
  compliance_override (bool), approval_routing ("auto_apply"|"human_review"|"escalated"),
  narrative (string explaining what was validated and any changes made)"""

    @property
    def tools(self) -> list[dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "check_price_bounds",
                    "description": "Check if a price is within the product's min/max bounds",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product_id": {"type": "string"},
                            "recommended_price": {"type": "number"},
                        },
                        "required": ["product_id", "recommended_price"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "check_margin_floor",
                    "description": "Check if a price preserves the org's margin floor",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product_id": {"type": "string"},
                            "org_id": {"type": "string"},
                            "recommended_price": {"type": "number"},
                        },
                        "required": ["product_id", "org_id", "recommended_price"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "check_rate_of_change",
                    "description": "Check if the price change exceeds org's max change cap",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product_id": {"type": "string"},
                            "org_id": {"type": "string"},
                            "recommended_price": {"type": "number"},
                        },
                        "required": ["product_id", "org_id", "recommended_price"],
                    },
                },
            },
        ]

    async def execute_tool(self, tool_name: str, arguments: dict) -> dict:
        if tool_name == "check_price_bounds":
            return await inventory_data.check_price_bounds(**arguments)
        if tool_name == "check_margin_floor":
            return await inventory_data.check_margin_floor(**arguments)
        if tool_name == "check_rate_of_change":
            return await inventory_data.check_rate_of_change(**arguments)
        return {"error": f"Unknown tool: {tool_name}"}
