/**
 * Dashboard.tsx — Home page with KPI cards and activity feed.
 *
 * KPI cards: pending approvals, auto-applied today, avg confidence, total recommendations
 * Activity feed: last 20 audit events
 * TODO: implement using useDashboardKpis() and useDashboardActivity()
 */
export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">TODO: KPI cards + activity feed</p>
    </div>
  )
}
