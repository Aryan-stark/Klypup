import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import ConfidenceGauge from './ConfidenceGauge'
import type { Recommendation } from '@/types/recommendation'

const STATUS_STYLES: Record<string, string> = {
  pending:       'bg-yellow-100 text-yellow-800',
  escalated:     'bg-orange-100 text-orange-800',
  approved:      'bg-green-100 text-green-800',
  applied:       'bg-blue-100 text-blue-800',
  auto_approved: 'bg-blue-100 text-blue-800',
  rejected:      'bg-red-100 text-red-800',
}

export default function RecommendationCard({ rec }: { rec: Recommendation }) {
  const isUp = rec.price_change_pct > 0
  const changeColor = isUp ? 'text-green-600' : 'text-red-600'
  const Icon = isUp ? TrendingUp : TrendingDown

  return (
    <Link
      to={`/recommendations/${rec.id}`}
      className="block rounded-lg border bg-card p-4 hover:border-primary transition-colors space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm leading-tight">{rec.product_name}</p>
          <p className="text-xs text-muted-foreground">{rec.product_sku}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[rec.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {rec.status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{formatCurrency(rec.current_price)}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-semibold">{formatCurrency(rec.recommended_price)}</span>
        <span className={`flex items-center gap-0.5 text-xs font-medium ml-auto ${changeColor}`}>
          <Icon className="h-3 w-3" />
          {formatPercent(Math.abs(rec.price_change_pct))}
        </span>
      </div>

      <div className="space-y-1">
        <ConfidenceGauge score={rec.confidence_score} />
        <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs">
          {rec.strategy_label.replace(/_/g, ' ')}
        </span>
      </div>
    </Link>
  )
}
