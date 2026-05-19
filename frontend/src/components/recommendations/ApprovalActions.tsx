import { useState } from 'react'
import { Check, X, Edit2 } from 'lucide-react'
import { useApprove, useReject, useModify } from '@/hooks/useRecommendations'
import type { RecommendationStatus } from '@/types/recommendation'

interface Props {
  id: string
  status: RecommendationStatus
  currentPrice: number
}

export default function ApprovalActions({ id, status, currentPrice }: Props) {
  const [view, setView] = useState<'idle' | 'reject' | 'modify'>('idle')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [overridePrice, setOverridePrice] = useState(currentPrice.toFixed(2))

  const approve = useApprove()
  const reject = useReject()
  const modify = useModify()

  const isActionable = status === 'pending' || status === 'escalated'
  if (!isActionable) return null

  const isPending = approve.isPending || reject.isPending || modify.isPending

  const handleApprove = () => {
    approve.mutate({ id, note })
  }

  const handleReject = () => {
    if (!reason.trim()) return
    reject.mutate({ id, reason, note })
  }

  const handleModify = () => {
    const price = parseFloat(overridePrice)
    if (isNaN(price) || price <= 0) return
    modify.mutate({ id, override_price: price, note })
  }

  if (view === 'reject') {
    return (
      <div className="glass-card rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">Reject Recommendation</p>
        <input
          className="w-full rounded border px-3 py-2 text-sm bg-background"
          placeholder="Reason (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <textarea
          className="w-full rounded border px-3 py-2 text-sm bg-background resize-none"
          placeholder="Additional notes (optional)"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={handleReject}
            disabled={!reason.trim() || isPending}
            className="flex-1 py-2 rounded bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50"
          >
            {reject.isPending ? 'Rejecting…' : 'Confirm Reject'}
          </button>
          <button
            onClick={() => setView('idle')}
            className="px-4 py-2 rounded border text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (view === 'modify') {
    return (
      <div className="glass-card rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">Override Price & Approve</p>
        <div>
          <label className="text-xs text-muted-foreground">Override Price ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded border px-3 py-2 text-sm bg-background mt-1"
            value={overridePrice}
            onChange={(e) => setOverridePrice(e.target.value)}
          />
        </div>
        <textarea
          className="w-full rounded border px-3 py-2 text-sm bg-background resize-none"
          placeholder="Note (optional)"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={handleModify}
            disabled={isPending}
            className="flex-1 py-2 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {modify.isPending ? 'Applying…' : 'Apply Override'}
          </button>
          <button
            onClick={() => setView('idle')}
            className="px-4 py-2 rounded border text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="flex items-center gap-1.5 px-4 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        {approve.isPending ? 'Approving…' : 'Approve'}
      </button>
      <button
        onClick={() => setView('reject')}
        disabled={isPending}
        className="flex items-center gap-1.5 px-4 py-2 rounded bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        <X className="h-4 w-4" />
        Reject
      </button>
      <button
        onClick={() => setView('modify')}
        disabled={isPending}
        className="flex items-center gap-1.5 px-4 py-2 rounded border text-sm font-medium hover:bg-muted disabled:opacity-50"
      >
        <Edit2 className="h-4 w-4" />
        Modify Price
      </button>
    </div>
  )
}
