"""
agents/demand_forecasting_agent.py — Agent 2 of 5.

Responsibility: Interpret demand signals (search volume, sales velocity,
seasonal patterns) to estimate price elasticity and demand trend.

Receives context from: MarketIntelligenceAgent
Feeds output to: PricingStrategyAgent

Output it produces (stored in context["demand_forecasting"]):
  {
    "demand_score": float (0-1),        # 1 = very high demand
    "trend_direction": "up"|"down"|"flat",
    "elasticity_estimate": "high"|"medium"|"low",
    "optimal_price_direction": "raise"|"hold"|"lower",
    "narrative": str
  }
"""
from app.agents.base_agent import BaseAgent
from app.tools import demand_signals as demand_tools


class DemandForecastingAgent(BaseAgent):
    name = "demand_forecasting"

    @property
    def system_prompt(self) -> str:
        return """You are a demand forecasting analyst for an e-commerce pricing system.

Your job: interpret search volume, sales velocity, and seasonal signals to
estimate demand elasticity and trend direction for a specific product.

You have context from the Market Intelligence agent. Use it alongside demand
signals to judge whether raising or lowering price is likely to be well-received
by the market right now.

Output a JSON object with:
- demand_score: 0.0 to 1.0 (higher = stronger demand)
- trend_direction: "up", "down", or "flat"
- elasticity_estimate: "high" (price-sensitive), "medium", or "low" (price-insensitive)
- optimal_price_direction: "raise", "hold", or "lower"
- narrative: one paragraph explaining your demand assessment"""

    @property
    def tools(self) -> list[dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "get_demand_signals",
                    "description": "Fetch demand and trend signals for a product",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product_id": {"type": "string"},
                            "days": {"type": "integer", "default": 30},
                        },
                        "required": ["product_id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "get_seasonal_index",
                    "description": "Get seasonal demand multiplier for a product category",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "category": {"type": "string"},
                        },
                        "required": ["category"],
                    },
                },
            },
        ]

    async def execute_tool(self, tool_name: str, arguments: dict) -> dict:
        if tool_name == "get_demand_signals":
            return await demand_tools.get_demand_signals(**arguments)
        if tool_name == "get_seasonal_index":
            return await demand_tools.get_seasonal_index(**arguments)
        return {"error": f"Unknown tool: {tool_name}"}
