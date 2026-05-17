/** Mirrors backend schemas/recommendation.py */

export interface ToolCallTrace {
  tool_name: string
  arguments: Record<string, unknown>
  result: Record<string, unknown>
  execution_ms: number
}

export interface AgentReasoning {
  agent_name: string
  narrative: string
  output_signal: Record<string, unknown>
  tool_calls: ToolCallTrace[]
  confidence_contrib: number | null
  execution_ms: number
}

export type RecommendationStatus =
  | 'pending'
  | 'auto_approved'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'applied'

export interface Recommendation {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  current_price: number
  recommended_price: number
  price_change_pct: number
  confidence_score: number
  strategy_label: string
  rationale_summary: string
  status: RecommendationStatus
  created_at: string
}

export interface RecommendationDetail extends Recommendation {
  agent_reasoning: AgentReasoning[]
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
}
