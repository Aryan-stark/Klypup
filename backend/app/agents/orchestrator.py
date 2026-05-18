"""
agents/orchestrator.py — Coordinates the 5-agent pipeline for each product.

Called by: run_service.trigger_run() as a FastAPI BackgroundTask
Calls: all 5 agents in sequence, then saves results to MongoDB

Flow for each product:
  1. Run all 5 agents sequentially, passing accumulated context forward
  2. Save each agent's reasoning as embedded subdoc in the recommendation
  3. Determine recommendation status using Python routing logic (not AI)
  4. If auto_approved: call ecommerce_api.apply_price_change() immediately
  5. Create AuditLog entry
  6. Push SSE progress event via run_service.push_event()

Why status routing is in Python, not in the AI:
  Business rules (confidence thresholds, compliance flags) must be deterministic
  and auditable. The same inputs must always produce the same routing decision.
"""
from beanie import PydanticObjectId

from app.agents.market_intelligence_agent import MarketIntelligenceAgent
from app.agents.demand_forecasting_agent import DemandForecastingAgent
from app.agents.inventory_cost_agent import InventoryCostAgent
from app.agents.pricing_strategy_agent import PricingStrategyAgent
from app.agents.execution_compliance_agent import ExecutionComplianceAgent
from app.models.pricing_recommendation import PricingRecommendation, RecommendationStatus
from app.services import audit_service
from app.tools import ecommerce_api
from app.utils.logger import get_logger

logger = get_logger(__name__)

AGENT_PIPELINE = [
    MarketIntelligenceAgent,
    DemandForecastingAgent,
    InventoryCostAgent,
    PricingStrategyAgent,
    ExecutionComplianceAgent,
]


async def run_for_product(
    product_id: str,
    org_id: PydanticObjectId,
    run_id: str,
    org_config: dict,
) -> PricingRecommendation | None:
    """
    Runs the full 5-agent pipeline for one product.
    Returns the saved PricingRecommendation, or None if an agent fails.
    """
    # Seed org_id into context so agents can pass it to org-scoped tools
    # (e.g. get_org_margin_floor, get_org_config) — without this, models invent fake IDs
    context = {"org_id": str(org_id)}

    for AgentClass in AGENT_PIPELINE:
        agent = AgentClass()
        try:
            output = await agent.run(product_id=product_id, context=context)
            context[agent.name] = output
        except Exception as exc:
            logger.error(f"[{agent.name}] failed for product {product_id}: {exc}")
            return None     # skip this product, continue the run

    return await _save_and_route(product_id, org_id, run_id, context, org_config)


async def _save_and_route(product_id, org_id, run_id, context, org_config):
    """Save recommendation and apply Python routing logic."""
    from app.models.product import Product
    from app.models.pricing_recommendation import AgentReasoning, ToolCallTrace

    strategy = context["pricing_strategy"]
    compliance = context["execution_compliance"]

    # Status routing — deterministic Python, not AI
    status = _route_status(
        confidence=strategy["confidence_score"],
        compliance_override=compliance.get("compliance_override", False),
        org_config=org_config,
    )

    # Fetch current product price for the recommendation record
    product = await Product.get(product_id)
    current_price = product.current_price if product else 0.0
    final_price = compliance["final_recommended_price"]
    price_change_pct = round(
        (final_price - current_price) / current_price, 4
    ) if current_price else 0.0

    # Map context dicts → AgentReasoning embedded subdocs
    agent_order = [
        ("market_intelligence", "MarketIntelligenceAgent"),
        ("demand_forecasting", "DemandForecastingAgent"),
        ("inventory_cost", "InventoryCostAgent"),
        ("pricing_strategy", "PricingStrategyAgent"),
        ("execution_compliance", "ExecutionComplianceAgent"),
    ]
    agent_reasoning = []
    for ctx_key, agent_name in agent_order:
        agent_out = context.get(ctx_key, {})
        tool_calls = [
            ToolCallTrace(
                tool_name=tc["tool_name"],
                arguments=tc["arguments"],
                result=tc["result"],
                execution_ms=tc.get("execution_ms", 0),
            )
            for tc in agent_out.get("_tool_calls", [])
        ]
        agent_reasoning.append(AgentReasoning(
            agent_name=agent_name,
            input_context={k: v for k, v in agent_out.items()
                           if not k.startswith("_")},
            tool_calls=tool_calls,
            output_signal={k: v for k, v in agent_out.items()
                           if not k.startswith("_") and k != "narrative"},
            narrative=agent_out.get("narrative", ""),
            execution_ms=agent_out.get("_execution_ms", 0),
        ))

    recommendation = PricingRecommendation(
        org_id=org_id,
        run_id=PydanticObjectId(run_id),
        product_id=PydanticObjectId(product_id),
        current_price=current_price,
        recommended_price=final_price,
        price_change_pct=price_change_pct,
        confidence_score=strategy["confidence_score"],
        strategy_label=strategy["strategy_label"],
        rationale_summary=compliance["narrative"],
        agent_reasoning=agent_reasoning,
        status=status,
    )
    await recommendation.insert()

    if status == RecommendationStatus.AUTO_APPROVED:
        await ecommerce_api.apply_price_change(
            product_id=product_id,
            new_price=compliance["final_recommended_price"],
        )
        await audit_service.log(
            org_id=org_id, action="price_updated",
            product_id=PydanticObjectId(product_id),
            recommendation_id=recommendation.id,
            new_value={"price": compliance["final_recommended_price"]},
        )

    return recommendation


def _route_status(confidence: float, compliance_override: bool,
                  org_config: dict) -> RecommendationStatus:
    """
    Pure Python routing — same inputs always produce same output.
    This is why routing is NOT delegated to the AI.
    """
    if compliance_override:
        return RecommendationStatus.ESCALATED
    if confidence >= org_config.get("auto_apply_threshold", 0.90):
        return RecommendationStatus.AUTO_APPROVED
    if confidence >= org_config.get("human_review_threshold", 0.70):
        return RecommendationStatus.PENDING
    return RecommendationStatus.REJECTED
