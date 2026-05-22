import { useState } from 'react'
import { Play, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useRecommendations } from '@/hooks/useRecommendations'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runService } from '@/services/runService'
import { MorphingCardStack, type CardData, type LayoutMode } from '@/components/ui/morphing-card-stack'
import RunAgentPlan from '@/components/runs/RunAgentPlan'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import RecommendationSkeleton from '@/components/common/RecommendationSkeleton'
import EmptyState from '@/components/common/EmptyState'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { ApiResponse } from '@/types/api'
import type { Recommendation } from '@/types/recommendation'

interface RunResult {
  id: string
  total_products: number
}

const STATUS_STYLES: Record<string, string> = {
  pending:       'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  escalated:     'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  approved:      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  applied:       'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  auto_approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  rejected:      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function RecCardContent({ rec, layout }: { rec: Recommendation; layout: LayoutMode }) {
  const isUp = rec.price_change_pct > 0
  const Icon = isUp ? TrendingUp : TrendingDown
  return (
    <div className="space-y-3 w-full">
      {/* Name + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm leading-tight truncate">{rec.product_name}</p>
          <p className="text-xs text-muted-foreground">{rec.product_sku}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[rec.status] ?? 'bg-muted text-muted-foreground'}`}>
          {rec.status.replace('_', ' ')}
        </span>
      </div>

      {/* Price arrow */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">{formatCurrency(rec.current_price)}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="font-semibold">{formatCurrency(rec.recommended_price)}</span>
        <span className={`flex items-center gap-0.5 text-xs font-medium ml-auto ${isUp ? 'text-green-600' : 'text-red-500'}`}>
          <Icon className="h-3 w-3" />
          {formatPercent(Math.abs(rec.price_change_pct))}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${rec.confidence_score * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Confidence</span>
          <span className="text-xs font-medium">{Math.round(rec.confidence_score * 100)}%</span>
        </div>
      </div>

      {/* Strategy label — hide in stack mode to save space */}
      {layout !== 'stack' && (
        <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs">
          {rec.strategy_label.replace(/_/g, ' ')}
        </span>
      )}
    </div>
  )
}

export default function Recommendations() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [activeRun,  setActiveRun]  = useState<RunResult | null>(null)
  const [modalOpen,  setModalOpen]  = useState(false)
  const qc = useQueryClient()

  const params = tab === 'pending'
    ? { status: 'pending,escalated', per_page: 50 }
    : { per_page: 50 }
  const { data, isLoading } = useRecommendations(params)

  const triggerRun = useMutation({
    mutationFn: () => runService.trigger(),
    onSuccess: (res: ApiResponse<RunResult>) => {
      const run = res.data
      setActiveRun({ id: run.id, total_products: run.total_products })
      setModalOpen(true)
    },
  })

  const handleDone = () => {
    setActiveRun(null)
    setModalOpen(false)
    qc.invalidateQueries({ queryKey: ['recommendations'] })
  }

  const handleToggleModal = () => setModalOpen((prev) => !prev)

  const items: Recommendation[] = (data?.data ?? []) as Recommendation[]
  const recById: Record<string, Recommendation> = Object.fromEntries(items.map(r => [r.id, r]))

  const cards: CardData[] = items.map(rec => ({ id: rec.id, title: rec.product_name, description: '' }))

  const renderCard = (card: CardData, layout: LayoutMode) => {
    const rec = recById[card.id]
    return rec ? <RecCardContent rec={rec} layout={layout} /> : null
  }

  return (
    <>
      {/* RunAgentPlan stays mounted while activeRun is set so SSE never drops */}
      <AnimatePresence>
        {activeRun && (
          <RunAgentPlan
            key={activeRun.id}
            runId={activeRun.id}
            totalProducts={activeRun.total_products}
            isOpen={modalOpen}
            onClose={handleToggleModal}
            onDone={handleDone}
          />
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Recommendations</h1>
          <button
            onClick={() => {
              if (activeRun) {
                setModalOpen(true)
              } else {
                triggerRun.mutate()
              }
            }}
            disabled={triggerRun.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground
                       text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
          >
            <Play className="h-4 w-4" />
            {triggerRun.isPending
              ? 'Starting…'
              : activeRun
              ? 'View Pipeline'
              : 'Run Pricing'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
          {(['pending', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'pending' ? 'Pending' : 'All'}
            </button>
          ))}
        </div>

        {isLoading && <RecommendationSkeleton />}

        {!isLoading && items.length === 0 && (
          <EmptyState message={tab === 'pending' ? 'No pending recommendations. Run pricing to generate new ones.' : 'No recommendations yet.'} />
        )}

        {!isLoading && items.length > 0 && (
          <MorphingCardStack
            cards={cards}
            defaultLayout="grid"
            onCardClick={(card) => navigate(`/recommendations/${card.id}`)}
            renderCard={renderCard}
          />
        )}
      </div>
    </>
  )
}
