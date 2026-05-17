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
