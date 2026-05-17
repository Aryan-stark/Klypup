/**
 * Settings.tsx — Admin-only configuration panel.
 *
 * Sections:
 *   1. Confidence Thresholds — auto-apply, human-review, reject-below sliders
 *   2. Price Change Caps — max increase / decrease percentages
 *   3. Margin Floor — global minimum gross margin
 *   4. Escalation — email, require dual approval toggle
 *
 * Role-guarded: only accessible by admin (enforced in App.tsx via RoleGuard).
 * TODO: implement using configService + ThresholdForm + MarginFloorForm components
 */
export default function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuration</h1>
      <p className="text-muted-foreground">TODO: admin config forms</p>
    </div>
  )
}
