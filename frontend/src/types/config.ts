/** Mirrors backend schemas/config.py */

export interface OrgConfig {
  auto_apply_threshold: number
  human_review_threshold: number
  reject_below_threshold: number
  max_price_increase_pct: number
  max_price_decrease_pct: number
  global_margin_floor_pct: number
  escalation_email: string | null
  require_dual_approval: boolean
}

export type AIProvider = 'cerebras' | 'gemini' | 'groq'

export interface AIConfig {
  ai_provider: AIProvider | null
  ai_model: string | null
  ai_key_set: boolean
  ai_key_preview: string | null
}

export interface AIConfigUpdate {
  ai_provider?: AIProvider | null
  ai_model?: string | null
  ai_api_key?: string | null
}

export interface AIVerifyRequest {
  ai_provider?: AIProvider | null
  ai_model?: string | null
  ai_api_key?: string | null
}

export interface AIVerifyResult {
  ok: boolean
  message: string
  latency_ms: number | null
}
