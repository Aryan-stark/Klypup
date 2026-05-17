import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentReasoning } from '@/types/recommendation'

const AGENT_LABELS: Record<string, { label: string; description: string }> = {
  MarketIntelligenceAgent:   { label: 'Market Intelligence',   description: 'Competitor pricing & positioning' },
  DemandForecastingAgent:    { label: 'Demand Forecasting',    description: 'Demand signals & elasticity' },
  InventoryCostAgent:        { label: 'Inventory & Cost',       description: 'Stock pressure & margin constraints' },
  PricingStrategyAgent:      { label: 'Pricing Strategy',      description: 'Price synthesis & confidence scoring' },
  ExecutionComplianceAgent:  { label: 'Execution Compliance',  description: 'Rule validation & routing' },
}

function AgentItem({ agent }: { agent: AgentReasoning }) {
  const [open, setOpen] = useState(false)
  const meta = AGENT_LABELS[agent.agent_name] ?? { label: agent.agent_name, description: '' }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div>
          <p className="text-sm font-medium">{meta.label}</p>
          <p className="text-xs text-muted-foreground">{meta.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground">{agent.execution_ms}ms</span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="border-t px-4 py-4 space-y-4 bg-muted/20">
          {/* Narrative */}
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Reasoning</p>
            <p className="text-sm leading-relaxed">{agent.narrative}</p>
          </div>

          {/* Output signal */}
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Output</p>
            <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-48">
              {JSON.stringify(agent.output_signal, null, 2)}
            </pre>
          </div>

          {/* Tool calls */}
          {agent.tool_calls.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Tool Calls ({agent.tool_calls.length})
              </p>
              <div className="space-y-2">
                {agent.tool_calls.map((tc, i) => (
                  <div key={i} className="rounded border bg-card text-xs">
                    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                      <code className="font-mono font-semibold">{tc.tool_name}</code>
                      <span className="text-muted-foreground">{tc.execution_ms}ms</span>
                    </div>
                    <div className="grid grid-cols-2 divide-x">
                      <div className="p-3">
                        <p className="text-muted-foreground mb-1">Args</p>
                        <pre className="overflow-auto max-h-32">{JSON.stringify(tc.arguments, null, 2)}</pre>
                      </div>
                      <div className="p-3">
                        <p className="text-muted-foreground mb-1">Result</p>
                        <pre className="overflow-auto max-h-32">{JSON.stringify(tc.result, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AgentReasoningPanel({ agents }: { agents: AgentReasoning[] }) {
  return (
    <div className="space-y-2">
      {agents.map((agent) => (
        <AgentItem key={agent.agent_name} agent={agent} />
      ))}
    </div>
  )
}
