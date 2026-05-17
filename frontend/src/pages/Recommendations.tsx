/**
 * Recommendations.tsx — Recommendation queue.
 *
 * Two tabs: "Pending" (default) and "All".
 * Each card shows: product name, current → recommended price, confidence gauge,
 * strategy badge, age.
 * Run pricing button triggers POST /runs.
 * TODO: implement using useRecommendations() hook
 */
export default function Recommendations() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recommendations</h1>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
          Run Pricing
        </button>
      </div>
      <p className="text-muted-foreground">TODO: recommendation queue with tabs</p>
    </div>
  )
}
