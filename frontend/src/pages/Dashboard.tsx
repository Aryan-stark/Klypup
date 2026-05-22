import { Clock, CheckCircle2, TrendingUp, BarChart3 } from 'lucide-react'
import { useDashboardKpis, useDashboardActivity } from '@/hooks/useDashboard'
import KpiCard from '@/components/dashboard/KpiCard'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import ConfidenceChart from '@/components/dashboard/ConfidenceChart'
import DashboardSkeleton from '@/components/common/DashboardSkeleton'
import { formatPercent } from '@/lib/utils'

interface KpiData {
  pending_approvals: number
  auto_applied_today: number
  avg_confidence_score: number
  total_recommendations: number
  active_products: number
  confidence_distribution: Array<{ label: string; count: number; color: string }>
}

export default function Dashboard() {
  const kpis = useDashboardKpis()
  const activity = useDashboardActivity()

  const kpiData = kpis.data?.data as KpiData | undefined

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {kpis.isLoading ? (
        <DashboardSkeleton />
      ) : kpiData ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Pending Approvals"
            value={kpiData.pending_approvals}
            sub="Waiting for analyst review"
            icon={<Clock className="h-4 w-4" />}
          />
          <KpiCard
            label="Auto-applied Today"
            value={kpiData.auto_applied_today}
            sub="High-confidence recommendations"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <KpiCard
            label="Avg Confidence"
            value={formatPercent(kpiData.avg_confidence_score ?? 0)}
            sub="Across all recommendations"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KpiCard
            label="Total Recommendations"
            value={kpiData.total_recommendations}
            sub={`${kpiData.active_products} active products`}
            icon={<BarChart3 className="h-4 w-4" />}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence distribution — data comes from KPI endpoint, no extra fetch */}
        <div className="glass-card rounded-lg p-5">
          <p className="text-sm font-semibold mb-4">Confidence Distribution</p>
          <ConfidenceChart distribution={kpiData?.confidence_distribution ?? []} />
        </div>

        {/* Recent activity */}
        <div className="glass-card rounded-lg p-5">
          <p className="text-sm font-semibold mb-4">Recent Activity</p>
          {activity.data?.data ? (
            <ActivityFeed items={activity.data.data as never} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
