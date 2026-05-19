import ThresholdForm from '@/components/settings/ThresholdForm'
import AIConfigForm from '@/components/settings/AIConfigForm'

export default function Settings() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Adjust AI thresholds, price change caps, escalation rules, and provider settings for your organisation.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">AI Configuration</h2>
        <AIConfigForm />
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Pricing Rules</h2>
        <ThresholdForm />
      </section>
    </div>
  )
}
