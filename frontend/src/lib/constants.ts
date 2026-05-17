export const ROLES = {
  ADMIN: 'admin',
  ANALYST: 'pricing_analyst',
} as const

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  auto_approved: 'Auto Approved',
  approved: 'Approved',
  rejected: 'Rejected',
  escalated: 'Escalated',
  applied: 'Applied',
}

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  auto_approved: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  escalated: 'bg-orange-100 text-orange-800',
  applied: 'bg-emerald-100 text-emerald-800',
}

export const AGENT_LABELS: Record<string, string> = {
  market_intelligence: 'Market Intelligence',
  demand_forecasting: 'Demand Forecasting',
  inventory_cost: 'Inventory & Cost',
  pricing_strategy: 'Pricing Strategy',
  execution_compliance: 'Execution & Compliance',
}
