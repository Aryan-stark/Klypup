/**
 * ConfidenceChart.tsx — Bar chart showing confidence score distribution.
 * Accepts pre-computed distribution from the /dashboard/kpis endpoint
 * (avoids a separate /recommendations fetch just for this chart).
 *
 * Buckets: <50% | 50–65% | 65–80% | 80–90% | 90%+
 */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface DistributionBucket {
  label: string
  count: number
  color: string
}

interface Props {
  distribution: DistributionBucket[]
}

export default function ConfidenceChart({ distribution }: Props) {
  const data = distribution
  const total = distribution.reduce((s, b) => s + b.count, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No recommendations yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value: number) => [value, 'Recommendations']}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export type { DistributionBucket }
