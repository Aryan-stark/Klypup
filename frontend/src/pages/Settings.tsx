import ThresholdForm from '@/components/settings/ThresholdForm'

export default function Settings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Adjust AI thresholds, price change caps, and escalation rules for your organisation.
        </p>
      </div>
      <ThresholdForm />
    </div>
  )
}
