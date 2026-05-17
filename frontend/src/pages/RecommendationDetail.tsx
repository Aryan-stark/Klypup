/**
 * RecommendationDetail.tsx — The most important page.
 *
 * Shows:
 *   - Product info + price change arrow (current → recommended)
 *   - Confidence score (large display)
 *   - Strategy label badge
 *   - Rationale summary
 *   - AgentReasoningPanel: accordion with one item per agent
 *     Each item: agent name, narrative, output_signal JSON, tool_calls trace
 *   - Approval actions: Approve / Reject / Modify (if status is pending)
 *   - Reviewed by + timestamp (if already decided)
 *
 * TODO: implement using useRecommendation(id) + AgentReasoningPanel + ApprovalActions
 */
import { useParams } from 'react-router-dom'

export default function RecommendationDetail() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Recommendation Detail</h1>
      <p className="text-muted-foreground">
        TODO: full agent reasoning view for recommendation {id}
      </p>
    </div>
  )
}
