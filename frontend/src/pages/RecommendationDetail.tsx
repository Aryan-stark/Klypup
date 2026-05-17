import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useRecommendation } from '@/hooks/useRecommendations'
import AgentReasoningPanel from '@/components/recommendations/AgentReasoningPanel'
import ApprovalActions from '@/components/recommendations/ApprovalActions'
import ConfidenceGauge from '@/components/recommendations/ConfidenceGauge'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorState from '@/components/common/ErrorState'
import { formatCurrency, formatPercent, formatDateTime } from '@/lib/utils'
import type { RecommendationDetail } from '@/types/recommendation'

const STATUS_STYLE: Record<string, string> = {
  pending:       'bg-yellow-100 text-yellow-800',
  escalated:     'bg-orange-100 text-orange-800',
  approved:      'bg-green-100 text-green-800',
  applied:       'bg-blue-100 text-blue-800',
  auto_approved: 'bg-blue-100 text-blue-800',
  rejected:      'bg-red-100 text-red-800',
}

export default function RecommendationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useRecommendation(id!)

  if (isLoading) return <LoadingSpinner />
  if (isError || !data?.data) return <ErrorState />

  const rec = data.data as RecommendationDetail
  const isUp = rec.price_change_pct > 0

  return (
    <div className="space-y-6 max-w-4xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Recommendations
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{rec.product_name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{rec.product_sku}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLE[rec.status] ?? 'bg-gray-100'}`}>
          {rec.status.replace('_', ' ')}
        </span>
      </div>

      {/* Price change + confidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-3">Price Recommendation</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl text-muted-foreground">{formatCurrency(rec.current_price)}</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <span className="text-3xl font-bold">{formatCurrency(rec.recommended_price)}</span>
            <span className={`text-sm font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}>
              {isUp ? '+' : ''}{formatPercent(rec.price_change_pct)}
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <ConfidenceGauge score={rec.confidence_score} size="lg" />
          <span className="mt-3 inline-block rounded bg-muted px-2 py-1 text-xs font-medium">
            {rec.strategy_label.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Rationale */}
      <div className="rounded-lg border bg-card p-5">
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Summary</p>
        <p className="text-sm leading-relaxed">{rec.rationale_summary}</p>
      </div>

      {/* Approval actions */}
      <ApprovalActions id={rec.id} status={rec.status} currentPrice={rec.current_price} />

      {/* Review info */}
      {rec.reviewed_by && (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
          <p><span className="font-medium">Reviewed:</span> {rec.reviewed_at ? formatDateTime(rec.reviewed_at) : '—'}</p>
          {rec.review_note && <p><span className="font-medium">Note:</span> {rec.review_note}</p>}
        </div>
      )}

      {/* Agent reasoning */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Agent Reasoning</h2>
        {rec.agent_reasoning?.length > 0 ? (
          <AgentReasoningPanel agents={rec.agent_reasoning} />
        ) : (
          <p className="text-sm text-muted-foreground">No agent reasoning available.</p>
        )}
      </div>
    </div>
  )
}
