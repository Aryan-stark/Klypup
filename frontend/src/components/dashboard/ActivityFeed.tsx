import { formatDateTime } from '@/lib/utils'
import type { AuditLog } from '@/types/audit'

const ACTION_COLORS: Record<string, string> = {
  recommendation_approved: 'bg-green-100 text-green-800',
  recommendation_rejected: 'bg-red-100 text-red-800',
  recommendation_escalated: 'bg-orange-100 text-orange-800',
  price_updated: 'bg-blue-100 text-blue-800',
  run_triggered: 'bg-purple-100 text-purple-800',
  config_changed: 'bg-yellow-100 text-yellow-800',
}

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

export default function ActivityFeed({ items }: { items: AuditLog[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground p-4">No activity yet.</p>
  }
  return (
    <div className="glass-card rounded-lg divide-y">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 px-4 py-3">
          <ActionBadge action={item.action} />
          <span className="flex-1 text-sm truncate">{item.product_name ?? '—'}</span>
          {item.old_value?.price != null && item.new_value?.price != null && (
            <span className="text-xs text-muted-foreground shrink-0">
              ${item.old_value.price as number} → ${item.new_value.price as number}
            </span>
          )}
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDateTime(item.occurred_at)}
          </span>
        </div>
      ))}
    </div>
  )
}
