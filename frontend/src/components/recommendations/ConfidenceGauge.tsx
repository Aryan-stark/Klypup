import { cn } from '@/lib/utils'

interface Props {
  score: number  // 0.0 – 1.0
  size?: 'sm' | 'lg'
}

export default function ConfidenceGauge({ score, size = 'sm' }: Props) {
  const pct = Math.round(score * 100)
  const barColor = pct >= 80 ? 'bg-green-500' : pct >= 65 ? 'bg-yellow-500' : 'bg-red-500'
  const textColor = pct >= 80 ? 'text-green-600' : pct >= 65 ? 'text-yellow-600' : 'text-red-600'

  if (size === 'lg') {
    return (
      <div className="space-y-2">
        <div className="flex items-end gap-2">
          <span className={cn('text-5xl font-bold', textColor)}>{pct}%</span>
          <span className="text-muted-foreground mb-1 text-sm">confidence</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1 min-w-[100px]">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Confidence</span>
        <span className={cn('font-semibold', textColor)}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
