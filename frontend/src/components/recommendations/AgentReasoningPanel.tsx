/**
 * AgentReasoningPanel.tsx — Animated accordion cards for 5-agent reasoning.
 * Uses framer-motion spring animations (same style as animated-project-cards).
 * Each card expands to show narrative, output signals, and tool call traces.
 */
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Terminal, Cpu, Clock, Search, TrendingUp, Package, DollarSign, ShieldCheck, Bot } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { AgentReasoning } from "@/types/recommendation"

// ── Agent metadata ─────────────────────────────────────────────────────────────

const AGENT_META: Record<string, {
  label: string
  description: string
  Icon: LucideIcon
  bg: string
}> = {
  MarketIntelligenceAgent:  { label: "Market Intelligence",  description: "Competitor pricing & market positioning", Icon: Search,      bg: "bg-blue-500"   },
  DemandForecastingAgent:   { label: "Demand Forecasting",   description: "Demand signals, elasticity & trend",      Icon: TrendingUp,  bg: "bg-emerald-500" },
  InventoryCostAgent:       { label: "Inventory & Cost",     description: "Stock pressure & margin constraints",     Icon: Package,     bg: "bg-orange-500"  },
  PricingStrategyAgent:     { label: "Pricing Strategy",     description: "Price synthesis & confidence scoring",    Icon: DollarSign,  bg: "bg-purple-500"  },
  ExecutionComplianceAgent: { label: "Execution Compliance", description: "Rule validation & approval routing",      Icon: ShieldCheck, bg: "bg-slate-600"   },
}

// ── Animation variants (spring physics matching the source component) ──────────

const cardVariants = {
  hidden:   { opacity: 0, y: 24, scale: 0.96 },
  visible:  { opacity: 1, y: 0,  scale: 1,
    transition: { type: "spring" as const, stiffness: 280, damping: 28, mass: 0.8 } },
}

const expandedVariants = {
  hidden:  { opacity: 0, height: 0,
    transition: { duration: 0.28, ease: [0.04, 0.62, 0.23, 0.98] as const } },
  visible: { opacity: 1, height: "auto",
    transition: { duration: 0.38, ease: [0.04, 0.62, 0.23, 0.98] as const,
      staggerChildren: 0.07, delayChildren: 0.08 } },
}

const rowVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 26 } },
}

const pillVariants = {
  hidden:  { opacity: 0, scale: 0.80, y: 8 },
  visible: { opacity: 1, scale: 1,    y: 0,
    transition: { type: "spring" as const, stiffness: 420, damping: 26 } },
  hover:   { scale: 1.06, y: -1,
    transition: { type: "spring" as const, stiffness: 420, damping: 26 } },
}

// ── Output signal pills ────────────────────────────────────────────────────────

function SignalPills({ output }: { output: Record<string, unknown> }) {
  const entries = Object.entries(output)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .slice(0, 6)

  return (
    <motion.div className="flex flex-wrap gap-2" variants={rowVariants}>
      {entries.map(([key, val], i) => (
        <motion.span
          key={i}
          variants={pillVariants}
          whileHover="hover"
          className="px-3 py-1 rounded-full text-xs font-medium
                     bg-secondary text-secondary-foreground
                     dark:bg-slate-700 dark:text-slate-200
                     shadow-sm cursor-default select-none"
        >
          <span className="opacity-60 mr-1">{key.replace(/_/g, " ")}:</span>
          <span className="font-semibold">{String(val)}</span>
        </motion.span>
      ))}
    </motion.div>
  )
}

// ── Tool call trace card ───────────────────────────────────────────────────────

function ToolCallCard({ tc, index }: { tc: AgentReasoning["tool_calls"][number]; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      variants={rowVariants}
      className="rounded-xl overflow-hidden border border-border/60
                 bg-white/60 dark:bg-slate-800/60
                 backdrop-blur-sm shadow-sm"
    >
      <button
        className="w-full flex items-center justify-between px-4 py-2.5
                   hover:bg-muted/40 dark:hover:bg-slate-700/40 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-primary/10 dark:bg-primary/20
                          flex items-center justify-center shrink-0">
            <Terminal className="w-3 h-3 text-primary" />
          </div>
          <code className="text-xs font-mono font-semibold text-foreground">
            {tc.tool_name}
          </code>
          <span className="text-[10px] text-muted-foreground">#{index + 1}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />{tc.execution_ms}ms
          </span>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 divide-x divide-border border-t border-border/60">
              <div className="p-3">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5 tracking-wider">Args</p>
                <pre className="text-[11px] font-mono overflow-auto max-h-36 text-foreground/80
                                scrollbar-thin scrollbar-thumb-border">
                  {JSON.stringify(tc.arguments, null, 2)}
                </pre>
              </div>
              <div className="p-3">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5 tracking-wider">Result</p>
                <pre className="text-[11px] font-mono overflow-auto max-h-36 text-foreground/80
                                scrollbar-thin scrollbar-thumb-border">
                  {JSON.stringify(tc.result, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Single agent card ──────────────────────────────────────────────────────────

function AgentCard({ agent, index }: { agent: AgentReasoning; index: number }) {
  const [open, setOpen] = useState(false)
  const meta = AGENT_META[agent.agent_name] ?? {
    label: agent.agent_name, description: "", Icon: Bot, bg: "bg-slate-500",
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.08 }}
      className="glass-card rounded-2xl overflow-hidden cursor-pointer
                 hover:-translate-y-0.5 transition-transform duration-200"
      onClick={() => setOpen((o) => !o)}
    >
      {/* Card header — always visible */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Agent icon */}
          <motion.div
            whileHover={{ scale: 1.12, rotate: 6, transition: { type: "spring", stiffness: 420, damping: 26 } }}
            className={`w-11 h-11 ${meta.bg} rounded-xl flex items-center justify-center
                        shadow-md shrink-0 select-none`}
          >
            <meta.Icon className="h-5 w-5 text-white" />
          </motion.div>

          {/* Labels */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{meta.label}</p>
              <div className="w-px h-3 bg-border shrink-0" />
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Cpu className="w-3 h-3" />
                {(agent.execution_ms / 1000).toFixed(1)}s
              </span>
              {agent.tool_calls.length > 0 && (
                <>
                  <div className="w-px h-3 bg-border shrink-0" />
                  <span className="text-[11px] text-muted-foreground">
                    {agent.tool_calls.length} tool call{agent.tool_calls.length > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{meta.description}</p>
          </div>
        </div>

        {/* Expand chevron */}
        <motion.button
          whileHover={{ scale: 1.08, backgroundColor: "rgba(var(--muted), 0.8)" }}
          whileTap={{ scale: 0.94 }}
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
          className="w-8 h-8 rounded-full bg-muted/60 dark:bg-slate-700/60
                     flex items-center justify-center shrink-0 ml-3 shadow-sm"
        >
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </motion.button>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={expandedVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-t border-border/40 px-5 py-5 space-y-5
                            bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm">

              {/* Output signals */}
              {Object.keys(agent.output_signal).length > 0 && (
                <motion.div variants={rowVariants}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest
                                text-muted-foreground mb-2.5">
                    Output Signals
                  </p>
                  <SignalPills output={agent.output_signal} />
                </motion.div>
              )}

              {/* Narrative */}
              {agent.narrative && (
                <motion.div variants={rowVariants}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest
                                text-muted-foreground mb-2">
                    Reasoning
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/85">
                    {agent.narrative}
                  </p>
                </motion.div>
              )}

              {/* Full output JSON (collapsed) */}
              <motion.details variants={rowVariants} className="group">
                <summary className="text-[10px] font-semibold uppercase tracking-widest
                                    text-muted-foreground cursor-pointer select-none
                                    hover:text-foreground transition-colors list-none
                                    flex items-center gap-1.5">
                  <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                  Raw JSON Output
                </summary>
                <pre className="mt-2 text-[11px] font-mono bg-muted/40 dark:bg-slate-800/60
                               rounded-xl p-4 overflow-auto max-h-52
                               text-foreground/70 border border-border/40">
                  {JSON.stringify(agent.output_signal, null, 2)}
                </pre>
              </motion.details>

              {/* Tool calls */}
              {agent.tool_calls.length > 0 && (
                <motion.div variants={rowVariants} className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest
                                text-muted-foreground mb-2.5">
                    Tool Calls ({agent.tool_calls.length})
                  </p>
                  {agent.tool_calls.map((tc, i) => (
                    <ToolCallCard key={i} tc={tc} index={i} />
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Panel export ───────────────────────────────────────────────────────────────

export default function AgentReasoningPanel({ agents }: { agents: AgentReasoning[] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="space-y-3"
    >
      {agents.map((agent, i) => (
        <AgentCard key={agent.agent_name} agent={agent} index={i} />
      ))}
    </motion.div>
  )
}
