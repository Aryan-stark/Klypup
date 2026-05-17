/** Mirrors backend schemas/audit.py */

export interface AuditLog {
  id: string
  product_id: string
  product_name: string | null
  recommendation_id: string | null
  actor_name: string | null
  action: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  occurred_at: string
}
