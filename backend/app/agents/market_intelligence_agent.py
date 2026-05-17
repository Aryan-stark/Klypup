"""
agents/market_intelligence_agent.py — Agent 1 of 5.

Responsibility: Analyse competitor prices and determine this product's
market positioning (below / at / above market, and by how much).

Tools it can call:
  - get_competitor_prices(product_id) → list of {competitor, price, in_stock}
  - get_product_details(product_id)   → {sku, name, current_price, category}

Output it produces (stored in context["market_intelligence"]):
  {
    "min_competitor_price": float,
    "max_competitor_price": float,
    "median_competitor_price": float,
    "price_position": "below_market" | "at_market" | "above_market",
    "competitive_gap_pct": float,    # (our_price - median) / median
    "narrative": str                 # 1-paragraph human-readable explanation
  }

This output feeds directly into PricingStrategyAgent's context.
"""
from app.agents.base_agent import BaseAgent
from app.tools import competitor_data


class MarketIntelligenceAgent(BaseAgent):
    name = "market_intelligence"

    @property
    def system_prompt(self) -> str:
        return """You are a market intelligence analyst for an e-commerce pricing system.

Your job: analyse competitor pricing data for a single product and determine
its current market positioning.

Use the available tools to fetch data. Then output a JSON object with:
- min_competitor_price, max_competitor_price, median_competitor_price (floats)
- price_position: "below_market", "at_market", or "above_market"
- competitive_gap_pct: signed percentage vs median (negative = we are cheaper)
- narrative: one paragraph explaining the competitive situation clearly

Always use JSON output format."""

    @property
    def tools(self) -> list[dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "get_competitor_prices",
                    "description": "Fetch the latest competitor prices for a product",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product_id": {"type": "string"},
                            "days": {"type": "integer", "default": 7},
                        },
                        "required": ["product_id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "get_product_details",
                    "description": "Fetch current price and basic info for a product",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product_id": {"type": "string"},
                        },
                        "required": ["product_id"],
                    },
                },
            },
        ]

    async def execute_tool(self, tool_name: str, arguments: dict) -> dict:
        if tool_name == "get_competitor_prices":
            return await competitor_data.get_competitor_prices(**arguments)
        if tool_name == "get_product_details":
            return await competitor_data.get_product_details(**arguments)
        return {"error": f"Unknown tool: {tool_name}"}
