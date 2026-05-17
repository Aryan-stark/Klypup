/**
 * RunProgressBar.tsx — Live SSE progress display for an active pricing run.
 *
 * Connects to GET /runs/{runId}/stream via EventSource.
 * Shows a progress bar + current product count.
 * Calls onComplete when the run finishes so the parent can refresh data.
 */
import { useEffect, useRef, useState } from 'react'
import { runService } from '@/services/runService'

interface Props {
  runId: string
  totalProducts: number
  onComplete: () => void
}

interface ProgressEvent {
  event: 'progress' | 'completed' | 'failed'
  products_processed?: number
  total_products?: number
  recommendations_generated?: number
  error?: string
}

export default function RunProgressBar({ runId, totalProducts, onComplete }: Props) {
  const [processed, setProcessed] = useState(0)
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [recsGenerated, setRecsGenerated] = useState(0)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = runService.streamProgress(runId)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const data: ProgressEvent = JSON.parse(e.data)
        if (data.event === 'progress') {
          setProcessed(data.products_processed ?? 0)
        } else if (data.event === 'completed') {
          setProcessed(data.products_processed ?? totalProducts)
          setRecsGenerated(data.recommendations_generated ?? 0)
          setDone(true)
          es.close()
          setTimeout(onComplete, 800)   // brief pause so user sees 100%
        } else if (data.event === 'failed') {
          setFailed(true)
          es.close()
        }
      } catch {
        // ignore malformed events
      }
    }

    es.onerror = () => {
      es.close()
    }

    return () => {
      es.close()
    }
  }, [runId, totalProducts, onComplete])

  const pct = totalProducts > 0 ? Math.round((processed / totalProducts) * 100) : 0

  if (failed) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
        Pricing run failed. Check server logs.
      </div>
    )
  }

  return (
    <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-blue-800 font-medium">
          {done
            ? `Run complete — ${recsGenerated} recommendations generated`
            : `Processing products… ${processed} / ${totalProducts}`}
        </span>
        <span className="text-blue-600 font-mono text-xs">{pct}%</span>
      </div>
      <div className="w-full bg-blue-100 rounded-full h-1.5">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
