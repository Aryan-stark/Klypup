import { Clock, CheckCircle2, TrendingUp, BarChart3 } from 'lucide-react'
import { useDashboardKpis, useDashboardActivity } from '@/hooks/useDashboard'
import KpiCard from '@/components/dashboard/KpiCard'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { formatPercent } from '@/lib/utils'

export default function Dashboard() {
  const kpis = useDashboardKpis()
  const activity = useDashboardActivity()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {kpis.isLoading ? (
        <LoadingSpinner />
      ) : kpis.data?.data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Pending Approvals"
            value={kpis.data.data.pending_approvals}
            sub="Waiting for analyst review"
            icon={<Clock className="h-4 w-4" />}
          />
          <KpiCard
            label="Auto-applied Today"
            value={kpis.data.data.auto_applied_today}
            sub="High-confidence recommendations"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <KpiCard
            label="Avg Confidence"
            value={formatPercent(kpis.data.data.avg_confidence_score ?? 0)}
            sub="Across all recommendations"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KpiCard
            label="Total Recommendations"
            value={kpis.data.data.total_recommendations}
            sub={`${kpis.data.data.active_products} active products`}
            icon={<BarChart3 className="h-4 w-4" />}
          />
        </div>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        {activity.isLoading ? (
          <LoadingSpinner />
        ) : activity.data?.data ? (
          <ActivityFeed items={activity.data.data as never} />
        ) : null}
      </div>
    </div>
  )
}
