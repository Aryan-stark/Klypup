"""
agents/pricing_strategy_agent.py — Agent 4 of 5. The central synthesiser.

Responsibility: Receive all 3 upstream agent outputs and synthesise them into
a single price recommendation with a named strategy, confidence score, and rationale.

This is the most important agent — its output becomes the recommendation shown to users.

Named strategies:
  - "competitive_undercut"  — price 5% below cheapest competitor
  - "competitive_parity"    — match median competitor price
  - "premium_capture"       — above median when demand is inelastic + low stock
  - "margin_expansion"      — raise when demand is low-elasticity + stock is normal
  - "clearance"             — lower aggressively when overstocked

Output (stored in context["pricing_strategy"]):
  {
    "recommended_price": float,
    "strategy_label": str,
    "strategy_rationale": str,
    "expected_margin_pct": float,
    "confidence_score": float (0-1),
    "risk_factors": list[str],
    "narrative": str
  }

Confidence derivation (narrated by the model, not hardcoded):
  - High confidence: all 3 agents agree on direction
  - Reduced confidence: agents disagree, high elasticity, thin margin, price volatility
"""
from app.agents.base_agent import BaseAgent
from app.tools import inventory_data


class PricingStrategyAgent(BaseAgent):
    name = "pricing_strategy"

    @property
    def system_prompt(self) -> str:
        return """You are the senior pricing strategist for an e-commerce company.

You receive structured inputs from three specialist agents:
  1. Market Intelligence: competitor prices and market positioning
  2. Demand Forecasting: demand elasticity and trend
  3. Inventory & Cost: margin headroom and inventory pressure

Your job: synthesise all inputs and produce ONE specific price recommendation
with a named strategy, confidence score, and clear rationale.

Available strategies:
  - "competitive_undercut": price 5% below cheapest competitor
  - "competitive_parity": match the median competitor price
  - "premium_capture": price above median (use when demand is inelastic and stock is low)
  - "margin_expansion": raise price moderately (use when demand is inelastic and stock normal)
  - "clearance": lower price aggressively (use when overstocked)

Confidence score guidance (0.0 to 1.0):
  - All agents agree on direction → high confidence (0.80-0.95)
  - Two of three agree → medium confidence (0.65-0.79)
  - Agents disagree → lower confidence (0.50-0.64)
  - High price elasticity → subtract 0.05-0.10
  - Critical inventory pressure → subtract 0.05

After calling any tools, output ONLY a valid JSON object. Key names must be EXACTLY:
  "recommended_price" (float),
  "strategy_label" (string — one of the 5 named strategies above),
  "strategy_rationale" (string),
  "expected_margin_pct" (float),
  "confidence_score" (float between 0.0 and 1.0 — REQUIRED, never omit),
  "risk_factors" (array of strings — empty array [] if none),
  "narrative" (string)

Example output shape:
{"recommended_price": 89.99, "strategy_label": "competitive_parity", "strategy_rationale": "...", "expected_margin_pct": 0.32, "confidence_score": 0.78, "risk_factors": [], "narrative": "..."}"""

    @property
    def tools(self) -> list[dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "get_org_config",
                    "description": "Get the org's pricing configuration (max change caps, margin floor)",
                    "parameters": {
                        "type": "object",
                        "properties": {"org_id": {"type": "string"}},
                        "required": ["org_id"],
                        "additionalProperties": False,
                    },
                },
            },
        ]

    async def execute_tool(self, tool_name: str, arguments: dict) -> dict:
        if tool_name == "get_org_config":
            return await inventory_data.get_org_config(org_id=arguments["org_id"])
        return {"error": f"Unknown tool: {tool_name}"}
