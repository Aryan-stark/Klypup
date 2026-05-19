import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { configService } from '@/services/configService'
import type { OrgConfig } from '@/types/config'

function pct(val: number) { return `${(val * 100).toFixed(0)}%` }

interface FieldProps {
  label: string
  description: string
  value: number
  field: keyof OrgConfig
  onChange: (f: keyof OrgConfig, v: number) => void
}

function ThresholdField({ label, description, value, field, onChange }: FieldProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(value * 100)}
          onChange={(e) => onChange(field, parseInt(e.target.value) / 100)}
          className="w-32"
        />
        <span className="text-sm font-mono w-10 text-right">{pct(value)}</span>
      </div>
    </div>
  )
}

export default function ThresholdForm() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: () => configService.get(),
  })

  const [local, setLocal] = useState<Partial<OrgConfig>>({})

  const config: OrgConfig | null = data?.data
    ? { ...data.data, ...local }
    : null

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<OrgConfig>) => configService.update(updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config'] })
      setLocal({})
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => configService.reset(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config'] })
      setLocal({})
    },
  })

  const handleChange = (field: keyof OrgConfig, value: number) => {
    setLocal((prev) => ({ ...prev, [field]: value }))
  }

  if (isLoading || !config) {
    return <p className="text-sm text-muted-foreground">Loading config…</p>
  }

  const isDirty = Object.keys(local).length > 0

  return (
    <div className="space-y-6">
      {/* Confidence thresholds */}
      <div className="glass-card rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-1">Confidence Thresholds</h3>
        <p className="text-xs text-muted-foreground mb-4">Controls when AI recommendations are auto-applied vs. queued for review.</p>
        <ThresholdField label="Auto-apply threshold" description="Recommendations above this confidence are applied automatically" value={config.auto_apply_threshold} field="auto_apply_threshold" onChange={handleChange} />
        <ThresholdField label="Human review threshold" description="Recommendations above this confidence are queued for analyst review" value={config.human_review_threshold} field="human_review_threshold" onChange={handleChange} />
        <ThresholdField label="Reject below threshold" description="Recommendations below this confidence are auto-rejected" value={config.reject_below_threshold} field="reject_below_threshold" onChange={handleChange} />
      </div>

      {/* Price change caps */}
      <div className="glass-card rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-1">Price Change Caps</h3>
        <p className="text-xs text-muted-foreground mb-4">Maximum allowed price movement per pricing run.</p>
        <ThresholdField label="Max price increase" description="Maximum % a price can be raised in one run" value={config.max_price_increase_pct} field="max_price_increase_pct" onChange={handleChange} />
        <ThresholdField label="Max price decrease" description="Maximum % a price can be lowered in one run" value={config.max_price_decrease_pct} field="max_price_decrease_pct" onChange={handleChange} />
      </div>

      {/* Margin floor */}
      <div className="glass-card rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-1">Margin Floor</h3>
        <p className="text-xs text-muted-foreground mb-4">Minimum gross margin the AI must preserve on every recommendation.</p>
        <ThresholdField label="Global margin floor" description="AI will never recommend a price below cost × (1 + floor)" value={config.global_margin_floor_pct} field="global_margin_floor_pct" onChange={handleChange} />
      </div>

      {/* Escalation */}
      <div className="glass-card rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-1">Escalation</h3>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium">Require dual approval</p>
            <p className="text-xs text-muted-foreground">Escalated recommendations need a second approver</p>
          </div>
          <button
            role="switch"
            onClick={() => handleChange('require_dual_approval' as keyof OrgConfig, (!config.require_dual_approval) as unknown as number)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.require_dual_approval ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${config.require_dual_approval ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="pt-3 border-t">
          <label className="text-sm font-medium">Escalation email</label>
          <input
            type="email"
            placeholder="alerts@company.com"
            className="mt-1 w-full rounded border px-3 py-2 text-sm bg-background"
            value={config.escalation_email ?? ''}
            onChange={(e) => setLocal((prev) => ({ ...prev, escalation_email: e.target.value || null }))}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => updateMutation.mutate(local)}
          disabled={!isDirty || updateMutation.isPending}
          className="px-5 py-2 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
          className="px-5 py-2 rounded border text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {resetMutation.isPending ? 'Resetting…' : 'Reset to Defaults'}
        </button>
        {isDirty && (
          <button onClick={() => setLocal({})} className="px-4 py-2 text-sm text-muted-foreground">
            Discard
          </button>
        )}
      </div>
    </div>
  )
}
