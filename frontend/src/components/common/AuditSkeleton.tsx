import { Skeleton } from '@/components/ui/skeleton'

export default function AuditSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 bg-muted/50 border-b">
        {['w-20', 'w-36', 'w-44', 'w-28', 'w-24', 'w-24'].map((w, i) => (
          <Skeleton key={i} className={`h-3 ${w}`} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3.5 border-b last:border-0 items-center">
          <Skeleton className="h-5 w-20 rounded-full shrink-0" />
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-28 ml-auto" />
        </div>
      ))}
    </div>
  )
}
