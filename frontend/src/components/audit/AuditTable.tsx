import { formatDateTime, formatCurrency } from '@/lib/utils'
import type { AuditLog } from '@/types/audit'

const ACTION_BADGE: Record<string, string> = {
  recommendation_approved:  'bg-green-100 text-green-800',
  recommendation_rejected:  'bg-red-100 text-red-800',
  recommendation_escalated: 'bg-orange-100 text-orange-800',
  price_updated:            'bg-blue-100 text-blue-800',
  run_triggered:            'bg-purple-100 text-purple-800',
  config_changed:           'bg-yellow-100 text-yellow-800',
}

export default function AuditTable({ entries }: { entries: AuditLog[] }) {
  if (!entries.length) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No audit entries found.</p>
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Time</th>
            <th className="px-4 py-3 text-left">Action</th>
            <th className="px-4 py-3 text-left">Product</th>
            <th className="px-4 py-3 text-left">Actor</th>
            <th className="px-4 py-3 text-right">Price Change</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map((e) => (
            <tr key={e.id} className="hover:bg-muted/20">
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {formatDateTime(e.occurred_at)}
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_BADGE[e.action] ?? 'bg-gray-100 text-gray-700'}`}>
                  {e.action.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-3">{e.product_name ?? <span className="text-muted-foreground">—</span>}</td>
              <td className="px-4 py-3 text-muted-foreground">{e.actor_name ?? 'System'}</td>
              <td className="px-4 py-3 text-right">
                {e.old_value?.price != null && e.new_value?.price != null ? (
                  <span>
                    {formatCurrency(e.old_value.price as number)}
                    {' → '}
                    {formatCurrency(e.new_value.price as number)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
