import { useState } from 'react'
import { Play } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useRecommendations } from '@/hooks/useRecommendations'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runService } from '@/services/runService'
import RecommendationCard from '@/components/recommendations/RecommendationCard'
import RunAgentPlan from '@/components/runs/RunAgentPlan'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import type { ApiResponse } from '@/types/api'
import type { Recommendation } from '@/types/recommendation'

interface RunResult {
  id: string
  total_products: number
}

export default function Recommendations() {
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [activeRun,  setActiveRun]  = useState<RunResult | null>(null)
  const [modalOpen,  setModalOpen]  = useState(false)
  const qc = useQueryClient()

  // Pending = needs human action → include both "pending" and "escalated" statuses
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

  // Called when the run finishes (user navigates away or dismisses after completion/failure)
  const handleDone = () => {
    setActiveRun(null)
    setModalOpen(false)
    qc.invalidateQueries({ queryKey: ['recommendations'] })
  }

  // Toggle modal visibility — SSE keeps running in background via mounted component
  const handleToggleModal = () => setModalOpen((prev) => !prev)

  const items: Recommendation[] = (data?.data ?? []) as Recommendation[]

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
                // Re-open the existing run modal
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

        {isLoading && <LoadingSpinner />}

        {!isLoading && items.length === 0 && (
          <EmptyState message={tab === 'pending' ? 'No pending recommendations. Run pricing to generate new ones.' : 'No recommendations yet.'} />
        )}

        {!isLoading && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
