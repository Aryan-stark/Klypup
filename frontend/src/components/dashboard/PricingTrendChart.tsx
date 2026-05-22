import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { Recommendation } from '@/types/recommendation'

interface Props {
  recommendations: Recommendation[]
}

function formatShortDate(iso: string) {
  const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + 'Z'
  const d = new Date(normalized)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface ChartPoint {
  label: string
  productName: string
  confidence: number
  priceChange: number
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as ChartPoint
  return (
    <div
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
        padding: '10px 12px',
        fontSize: '12px',
        maxWidth: '200px',
      }}
    >
      <p className="font-semibold truncate mb-1">{point.productName}</p>
      <p className="text-muted-foreground">{point.label}</p>
      <div className="mt-2 space-y-1">
        <p>
          <span style={{ color: 'hsl(var(--primary))' }}>● </span>
          Confidence: <strong>{point.confidence}%</strong>
        </p>
        <p>
          <span style={{ color: 'hsl(142 76% 36%)' }}>● </span>
          Price Change: <strong>{point.priceChange > 0 ? '+' : ''}{point.priceChange}%</strong>
        </p>
      </div>
    </div>
  )
}

export default function PricingTrendChart({ recommendations }: Props) {
  if (!recommendations.length) return null

  // Sort by date, take last 30
  const sorted = [...recommendations]
    .filter((r) => r.created_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-30)

  const points: ChartPoint[] = sorted.map((r) => ({
    label: formatShortDate(r.created_at),
    productName: r.product_name,
    confidence: Math.round(r.confidence_score * 100),
    // price_change_pct is a decimal (0.05 = 5%) — multiply to get %
    priceChange: parseFloat((r.price_change_pct * 100).toFixed(1)),
  }))

  if (points.length < 2) return null

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={32}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          formatter={(value) => value === 'confidence' ? 'Confidence Score' : 'Price Change %'}
        />
        <Line
          type="monotone"
          dataKey="confidence"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 2, fill: 'hsl(var(--primary))' }}
          activeDot={{ r: 5 }}
          name="confidence"
        />
        <Line
          type="monotone"
          dataKey="priceChange"
          stroke="hsl(142 76% 36%)"
          strokeWidth={2}
          dot={{ r: 2, fill: 'hsl(142 76% 36%)' }}
          activeDot={{ r: 5 }}
          strokeDasharray="4 3"
          name="priceChange"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
