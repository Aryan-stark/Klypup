/**
 * Audit.tsx — Full audit trail.
 *
 * Filterable by: product, action type, date range.
 * Columns: date, action, product, actor, old price → new price.
 * Export to CSV button (admin only).
 * TODO: implement using useAudit() hook + AuditTable + AuditFilters
 */
export default function Audit() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Trail</h1>
      <p className="text-muted-foreground">TODO: audit log table with filters</p>
    </div>
  )
}
