import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Play } from 'lucide-react'
import { useRuns, useTriggerRun } from '@/hooks/useRuns'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import RunAgentPlan from '@/components/runs/RunAgentPlan'
import { formatDateTime } from '@/lib/utils'

const STATUS_STYLE: Record<string, string> = {
  running:   'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed:    'bg-red-100 text-red-800',
  pending:   'bg-yellow-100 text-yellow-800',
}

interface Run {
  id: string
  status: string
  trigger_mode: string
  total_products: number
  products_processed: number
  recommendations_generated: number
  started_at: string
  completed_at: string | null
  error_message: string | null
}

export default function Runs() {
  const { data, isLoading } = useRuns()
  const runs: Run[] = (data?.data ?? []) as Run[]
  const trigger = useTriggerRun()

  const [activeRunId,   setActiveRunId]   = useState<string | null>(null)
  const [totalProducts, setTotalProducts] = useState(0)
  const [modalOpen,     setModalOpen]     = useState(false)

  const handleTrigger = async () => {
    try {
      const result = await trigger.mutateAsync()
      const run = result.data as { id: string; total_products: number }
      setTotalProducts(run.total_products ?? 0)
      setActiveRunId(run.id)
      setModalOpen(true)
    } catch {
      /* error handled by mutation */
    }
  }

  return (
    <>
    <AnimatePresence>
      {activeRunId && (
        <RunAgentPlan
          key={activeRunId}
          runId={activeRunId}
          totalProducts={totalProducts}
          isOpen={modalOpen}
          onClose={() => setModalOpen((p) => !p)}
          onDone={() => { setActiveRunId(null); setModalOpen(false) }}
        />
      )}
    </AnimatePresence>

    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pricing Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            History of all AI pricing pipeline executions.
          </p>
        </div>
        <button
          onClick={activeRunId ? () => setModalOpen(true) : handleTrigger}
          disabled={trigger.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground
                     text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
        >
          <Play className="h-4 w-4" />
          {trigger.isPending ? 'Starting…' : activeRunId ? 'View Pipeline' : 'Run Pricing'}
        </button>
      </div>

      {isLoading && <LoadingSpinner />}

      {!isLoading && runs.length === 0 && (
        <EmptyState message="No runs yet. Trigger one from the Recommendations page." />
      )}

      {!isLoading && runs.length > 0 && (
        <div className="glass-card rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Started</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Products</th>
                <th className="px-4 py-3 text-right">Recommendations</th>
                <th className="px-4 py-3 text-left">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {runs.map((run) => {
                const durationSec = run.completed_at
                  ? Math.round(
                      (new Date(run.completed_at).getTime() -
                        new Date(run.started_at).getTime()) /
                        1000
                    )
                  : null

                return (
                  <tr key={run.id}>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(run.started_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[run.status] ?? 'bg-gray-100'}`}>
                        {run.status}
                      </span>
                      {run.status === 'running' && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {run.products_processed}/{run.total_products}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {run.products_processed}/{run.total_products}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {run.recommendations_generated}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {durationSec != null
                        ? durationSec >= 60
                          ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
                          : `${durationSec}s`
                        : run.status === 'running' ? 'In progress…' : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {runs.some((r) => r.error_message) && (
            <div className="px-4 py-3 bg-red-50 border-t text-xs text-red-700 space-y-1">
              {runs.filter((r) => r.error_message).map((r) => (
                <p key={r.id}><span className="font-medium">{formatDateTime(r.started_at)}:</span> {r.error_message}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}
