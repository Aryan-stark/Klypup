/**
 * ConfidenceChart.tsx — Bar chart showing confidence score distribution
 * across all pending recommendations.
 *
 * Buckets: <50% | 50–65% | 65–80% | 80–90% | 90%+
 * Colour-coded green/yellow/orange/red to match ConfidenceGauge thresholds.
 */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Recommendation } from '@/types/recommendation'

interface Props {
  recommendations: Recommendation[]
}

const BUCKETS = [
  { label: '<50%',   min: 0,    max: 0.50, color: '#ef4444' },
  { label: '50–65%', min: 0.50, max: 0.65, color: '#f97316' },
  { label: '65–80%', min: 0.65, max: 0.80, color: '#eab308' },
  { label: '80–90%', min: 0.80, max: 0.90, color: '#84cc16' },
  { label: '90%+',   min: 0.90, max: 1.01, color: '#22c55e' },
]

export default function ConfidenceChart({ recommendations }: Props) {
  const data = BUCKETS.map((b) => ({
    label: b.label,
    count: recommendations.filter(
      (r) => r.confidence_score >= b.min && r.confidence_score < b.max
    ).length,
    color: b.color,
  }))

  if (recommendations.length === 0) {
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
