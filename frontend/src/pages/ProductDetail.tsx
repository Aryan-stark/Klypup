import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useProduct, useProductHistory } from '@/hooks/useProducts'
import PriceHistoryChart from '@/components/products/PriceHistoryChart'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorState from '@/components/common/ErrorState'
import { formatCurrency, formatPercent, formatDateTime } from '@/lib/utils'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useProduct(id!)
  const history = useProductHistory(id!)

  if (isLoading) return <LoadingSpinner />
  if (isError || !data?.data) return <ErrorState />

  const p = data.data

  const invBadge: Record<string, string> = {
    ok: 'bg-green-100 text-green-800',
    low: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800',
    out_of_stock: 'bg-gray-100 text-gray-600',
    overstock: 'bg-blue-100 text-blue-800',
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{p.name}</h1>
        <p className="text-sm text-muted-foreground font-mono">{p.sku} · {p.category}</p>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Current Price', value: formatCurrency(p.current_price) },
          { label: 'Cost Basis', value: formatCurrency(p.cost_basis) },
          { label: 'Gross Margin', value: formatPercent(p.margin_pct) },
          { label: 'Stock', value: p.stock_quantity },
        ].map(({ label, value }) => (
          <div key={label} className="glass-card rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${invBadge[p.inventory_status] ?? 'bg-gray-100'}`}>
          {p.inventory_status.replace('_', ' ')}
        </span>
        {p.latest_recommendation_status && (
          <span className="rounded-full px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800">
            Last rec: {p.latest_recommendation_status.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Price history */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Price History</h2>
        {history.isLoading ? (
          <LoadingSpinner />
        ) : history.data?.data && (history.data.data as unknown[]).length > 0 ? (
          <>
            <PriceHistoryChart
              history={history.data.data as Array<{ occurred_at: string; new_value: { price?: number } | null; old_value: { price?: number } | null }>}
            />
            <div className="glass-card rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Old Price</th>
                    <th className="px-4 py-3 text-right">New Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(history.data.data as Array<{ id: string; occurred_at: string; old_value: { price?: number } | null; new_value: { price?: number } | null }>).map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(entry.occurred_at)}</td>
                      <td className="px-4 py-3 text-right">{entry.old_value?.price != null ? formatCurrency(entry.old_value.price) : '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">{entry.new_value?.price != null ? formatCurrency(entry.new_value.price) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No price changes recorded yet.</p>
        )}
      </div>
    </div>
  )
}
