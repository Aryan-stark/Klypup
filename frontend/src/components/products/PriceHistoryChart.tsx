import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface PricePoint {
  date: string
  price: number
}

interface Props {
  history: Array<{
    occurred_at: string
    new_value: { price?: number } | null
    old_value: { price?: number } | null
  }>
}

function formatShortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function PriceHistoryChart({ history }: Props) {
  const points: PricePoint[] = history
    .filter((e) => e.new_value?.price != null)
    .map((e) => ({
      date: formatShortDate(e.occurred_at),
      price: e.new_value!.price!,
    }))
    .reverse()

  if (points.length < 2) return null

  return (
    <div className="glass-card rounded-lg p-4 mb-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Price Trend</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            formatter={(v: number) => [formatCurrency(v), 'Price']}
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
