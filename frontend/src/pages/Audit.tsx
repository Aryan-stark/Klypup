import { useState } from 'react'
import { Download } from 'lucide-react'
import { useAudit } from '@/hooks/useAudit'
import { useAuthStore } from '@/store/authStore'
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
  const [exporting, setExporting] = useState(false)

  const { data, isLoading } = useAudit({ action: action || undefined, page, per_page: 50 })

  const handleExport = async () => {
    setExporting(true)
    try {
      const token = useAuthStore.getState().accessToken
      const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'
      const res = await fetch(`${baseURL}/audit/export`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Export failed: ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'audit_log.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const entries: AuditLog[] = (data?.data ?? []) as AuditLog[]
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-3 py-2 rounded border text-sm hover:bg-muted disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
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
