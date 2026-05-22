import { Skeleton } from '@/components/ui/skeleton'

export default function ProductTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-56 rounded" />
        <Skeleton className="h-10 w-36 rounded" />
        <Skeleton className="h-10 w-32 rounded" />
        <Skeleton className="h-10 w-20 rounded" />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-8 gap-4 px-4 py-3 bg-muted/50 border-b">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-3" />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-8 gap-4 px-4 py-3.5 border-b last:border-0">
            <Skeleton className="h-3.5 col-span-1" />
            <Skeleton className="h-3.5 col-span-2" />
            <Skeleton className="h-3.5 col-span-1" />
            <Skeleton className="h-3.5 col-span-1" />
            <Skeleton className="h-3.5 col-span-1" />
            <Skeleton className="h-5 w-16 rounded-full col-span-1" />
            <Skeleton className="h-5 w-16 rounded-full col-span-1" />
          </div>
        ))}
      </div>
    </div>
  )
}
