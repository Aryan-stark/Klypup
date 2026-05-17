"""
agents/inventory_cost_agent.py — Agent 3 of 5.

Responsibility: Check stock levels and margin constraints. Flags when
inventory pressure (overstock or low stock) should influence the price direction.

Output it produces (stored in context["inventory_cost"]):
  {
    "current_margin_pct": float,
    "margin_headroom_pct": float,   # how much margin above the floor
    "inventory_pressure": "overstock"|"normal"|"low_stock"|"critical_low",
    "min_viable_price": float,      # cost + margin floor
    "stock_recommendation": "raise"|"hold"|"lower",
    "narrative": str
  }
"""
from app.agents.base_agent import BaseAgent
from app.tools import inventory_data


class InventoryCostAgent(BaseAgent):
    name = "inventory_cost"
    model = "llama-3.1-8b-instant"    # simpler task — use faster/cheaper model

    @property
    def system_prompt(self) -> str:
        return """You are an inventory and cost analyst for an e-commerce pricing system.

Your job: determine whether inventory levels and cost constraints should
push the price up, down, or hold steady.

Rules to follow:
- Never recommend a price below min_viable_price (cost + margin floor)
- If stock is critically low: recommend "raise" to slow demand
- If stock is very high (overstock): recommend "lower" to accelerate clearance
- If stock is normal: no inventory pressure on price direction

Output a JSON object with:
- current_margin_pct: current gross margin as a decimal (e.g. 0.35 = 35%)
- margin_headroom_pct: how much margin is above the org's floor
- inventory_pressure: "overstock", "normal", "low_stock", or "critical_low"
- min_viable_price: the lowest price that preserves the margin floor
- stock_recommendation: "raise", "hold", or "lower"
- narrative: one paragraph explaining inventory and cost constraints"""

    @property
    def tools(self) -> list[dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "get_inventory_levels",
                    "description": "Get stock quantity, COGS, and reorder status for a product",
                    "parameters": {
                        "type": "object",
                        "properties": {"product_id": {"type": "string"}},
                        "required": ["product_id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "get_org_margin_floor",
                    "description": "Get the org's configured minimum margin percentage",
                    "parameters": {
                        "type": "object",
                        "properties": {"org_id": {"type": "string"}},
                        "required": ["org_id"],
                    },
                },
            },
        ]

    async def execute_tool(self, tool_name: str, arguments: dict) -> dict:
        if tool_name == "get_inventory_levels":
            return await inventory_data.get_inventory_levels(**arguments)
        if tool_name == "get_org_margin_floor":
            return await inventory_data.get_org_margin_floor(**arguments)
        return {"error": f"Unknown tool: {tool_name}"}
