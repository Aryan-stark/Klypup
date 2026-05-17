import { useState } from 'react'
import { Download } from 'lucide-react'
import { useAudit } from '@/hooks/useAudit'
import AuditTable from '@/components/audit/AuditTable'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import type { AuditLog } from '@/types/audit'

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'price_updated', label: 'Price updated' },
  { value: 'recommendation_approved', label: 'Approved' },
  { value: 'recommendation_rejected', label: 'Rejected' },
  { value: 'recommendation_escalated', label: 'Escalated' },
  { value: 'run_triggered', label: 'Run triggered' },
  { value: 'config_changed', label: 'Config changed' },
]

export default function Audit() {
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useAudit({ action: action || undefined, page, per_page: 50 })

  const entries: AuditLog[] = (data?.data ?? []) as AuditLog[]
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <a
          href="/api/v1/audit/export"
          download
          className="flex items-center gap-2 px-3 py-2 rounded border text-sm hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>

      <div className="flex gap-3">
        <select
          className="rounded border px-3 py-2 text-sm bg-background"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1) }}
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingSpinner />}

      {!isLoading && (
        <>
          <AuditTable entries={entries} />
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{meta.total} entries</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded border disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-3 py-1">{page} / {meta.total_pages}</span>
                <button
                  disabled={page === meta.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded border disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
