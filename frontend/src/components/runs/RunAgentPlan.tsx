/**
 * RunAgentPlan.tsx — Live animated 5-agent pipeline plan shown during a run.
 *
 * isOpen=true  → full modal overlay
 * isOpen=false → compact floating pill (SSE connection stays alive)
 *
 * SSE events are per-product (all 5 agents complete together), so we:
 *   - Use a 12s interval to animate through agents 1→5 while running
 *   - Snap all to "completed" when the SSE `progress` event fires
 *   - Show failed state on SSE `failed` event
 */
import { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import {
  CheckCircle2, Circle, CircleDotDashed, CircleX,
  ChevronDown, X, ExternalLink, Search, TrendingUp,
  Package, DollarSign, ShieldCheck, Maximize2, Bot,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { runService } from "@/services/runService"

// ── Agent definitions ──────────────────────────────────────────────────────────

type AgentStatus = "pending" | "in-progress" | "completed" | "failed"

interface AgentTool {
  id: string
  name: string
  description: string
}

interface AgentDef {
  id: string
  label: string
  description: string
  Icon: LucideIcon
  color: string
  tools: AgentTool[]
}

const AGENTS: AgentDef[] = [
  {
    id: "market_intelligence",
    label: "Market Intelligence",
    description: "Analyses competitor pricing and determines market positioning",
    Icon: Search,
    color: "bg-blue-500",
    tools: [
      { id: "t1", name: "get_competitor_prices", description: "Fetches latest competitor prices for the last 7 days" },
      { id: "t2", name: "get_product_details", description: "Retrieves current price, SKU, and product metadata" },
    ],
  },
  {
    id: "demand_forecasting",
    label: "Demand Forecasting",
    description: "Interprets demand signals and estimates price elasticity",
    Icon: TrendingUp,
    color: "bg-emerald-500",
    tools: [
      { id: "t3", name: "get_demand_signals", description: "Fetches search volume, sales velocity, and trend signals" },
      { id: "t4", name: "get_seasonal_index", description: "Returns seasonal demand multiplier for the current month" },
    ],
  },
  {
    id: "inventory_cost",
    label: "Inventory & Cost",
    description: "Evaluates stock pressure and margin constraints",
    Icon: Package,
    color: "bg-orange-500",
    tools: [
      { id: "t5", name: "get_inventory_levels", description: "Returns stock quantity, reorder point, and COGS" },
      { id: "t6", name: "get_org_margin_floor", description: "Fetches the org's minimum acceptable margin percentage" },
    ],
  },
  {
    id: "pricing_strategy",
    label: "Pricing Strategy",
    description: "Synthesises all signals into a recommended price and confidence score",
    Icon: DollarSign,
    color: "bg-purple-500",
    tools: [
      { id: "t7", name: "get_org_config", description: "Loads org thresholds: auto-apply, human-review, margin floor" },
    ],
  },
  {
    id: "execution_compliance",
    label: "Execution Compliance",
    description: "Validates recommended price against hard business rules",
    Icon: ShieldCheck,
    color: "bg-slate-600",
    tools: [
      { id: "t8", name: "check_price_bounds", description: "Verifies price is within product min/max bounds" },
      { id: "t9", name: "check_margin_floor", description: "Confirms price preserves the org's margin floor" },
      { id: "t10", name: "check_rate_of_change", description: "Ensures price change does not exceed org's max cap" },
    ],
  },
]

// ── Animation variants ─────────────────────────────────────────────────────────

const rowVariants = {
  hidden:  { opacity: 0, y: -5 },
  visible: { opacity: 1, y: 0,
    transition: { type: "spring" as const, stiffness: 500, damping: 30 } },
  exit:    { opacity: 0, y: -5, transition: { duration: 0.15 } },
}

const subtaskListVariants = {
  hidden:  { opacity: 0, height: 0, overflow: "hidden" },
  visible: { height: "auto", opacity: 1, overflow: "visible",
    transition: { duration: 0.25, staggerChildren: 0.05,
      when: "beforeChildren", ease: [0.2, 0.65, 0.3, 0.9] as const } },
  exit:    { height: 0, opacity: 0, overflow: "hidden",
    transition: { duration: 0.2, ease: [0.2, 0.65, 0.3, 0.9] as const } },
}

const subtaskRowVariants = {
  hidden:  { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0,
    transition: { type: "spring" as const, stiffness: 500, damping: 25 } },
  exit:    { opacity: 0, x: -10, transition: { duration: 0.15 } },
}

// ── Status icon ────────────────────────────────────────────────────────────────

function StatusIcon({ status, size = "h-4 w-4" }: { status: AgentStatus; size?: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
        transition={{ duration: 0.2, ease: [0.2, 0.65, 0.3, 0.9] as const }}
      >
        {status === "completed"   ? <CheckCircle2    className={`${size} text-green-500`} /> :
         status === "in-progress" ? <CircleDotDashed className={`${size} text-blue-500 animate-spin`} style={{ animationDuration: "2s" }} /> :
         status === "failed"      ? <CircleX         className={`${size} text-red-500`} /> :
                                    <Circle          className={`${size} text-muted-foreground/40`} />}
      </motion.div>
    </AnimatePresence>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<AgentStatus, string> = {
  "pending":     "bg-muted text-muted-foreground",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "completed":   "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "failed":      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  runId: string
  totalProducts: number
  isOpen: boolean
  onClose: () => void   // hide modal → mini-pill (SSE stays alive)
  onDone: () => void    // run finished → clear run state entirely
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RunAgentPlan({ runId, totalProducts, isOpen, onClose, onDone }: Props) {
  const navigate = useNavigate()

  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(AGENTS.map(() => "pending"))
  const [expandedAgents, setExpandedAgents]   = useState<string[]>([])
  const [expandedTools,  setExpandedTools]    = useState<Record<string, boolean>>({})
  const [currentAgent,   setCurrentAgent]     = useState(0)
  const [productsProcessed, setProductsProcessed] = useState(0)
  const [runStatus, setRunStatus] = useState<"running" | "completed" | "failed">("running")
  const [errorMsg,  setErrorMsg]  = useState("")

  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const sourceRef      = useRef<EventSource | null>(null)
  // Track whether the run already finished — read inside onerror to avoid stale closure
  const completedRef   = useRef(false)

  // Advance through agents on a timer (~12s each)
  const startAgentTimer = useCallback((fromAgent: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    let idx = fromAgent
    setAgentStatuses((prev) => prev.map((s, i) => i === idx ? "in-progress" : s))
    setExpandedAgents([AGENTS[idx].id])
    setCurrentAgent(idx)

    timerRef.current = setInterval(() => {
      setAgentStatuses((prev) => {
        const next = [...prev]
        next[idx] = "completed"
        idx++
        if (idx < AGENTS.length) {
          next[idx] = "in-progress"
          setCurrentAgent(idx)
          setExpandedAgents([AGENTS[idx].id])
        } else {
          if (timerRef.current) clearInterval(timerRef.current)
        }
        return next
      })
    }, 12_000)
  }, [])

  // Connect to SSE — runs for the lifetime of this component (not just when modal is open)
  useEffect(() => {
    startAgentTimer(0)

    const es = runService.streamProgress(runId)
    sourceRef.current = es

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)

        if (data.event === "progress") {
          if (timerRef.current) clearInterval(timerRef.current)
          setAgentStatuses(AGENTS.map(() => "completed"))
          setProductsProcessed(data.products_processed)
          if (data.products_processed < totalProducts) {
            setTimeout(() => {
              setAgentStatuses(AGENTS.map(() => "pending"))
              startAgentTimer(0)
            }, 2_500)
          }
        }

        if (data.event === "completed") {
          if (timerRef.current) clearInterval(timerRef.current)
          completedRef.current = true
          setAgentStatuses(AGENTS.map(() => "completed"))
          setProductsProcessed(data.products_processed)
          setRunStatus("completed")
          es.close()
        }

        if (data.event === "failed") {
          if (timerRef.current) clearInterval(timerRef.current)
          completedRef.current = true
          setAgentStatuses((prev) => prev.map((s) => s === "in-progress" ? "failed" : s))
          setRunStatus("failed")
          setErrorMsg(data.error ?? "Unknown error")
          es.close()
        }
      } catch { /* malformed event */ }
    }

    // onerror fires when the SSE connection closes — including the normal close after
    // the backend sends "completed". Guard with completedRef (a ref, not state) to avoid
    // the stale-closure bug where runStatus always reads "running" inside this handler.
    es.onerror = () => {
      if (!completedRef.current) {
        setRunStatus("failed")
        setErrorMsg("Connection lost")
      }
      es.close()
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      es.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  const toggleAgent = (id: string) =>
    setExpandedAgents((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const toggleTool = (key: string) =>
    setExpandedTools((prev) => ({ ...prev, [key]: !prev[key] }))

  const handleViewResults = () => {
    onDone()
    navigate("/recommendations")
  }

  const completedCount = agentStatuses.filter((s) => s === "completed").length
  const progressPct    = Math.round((completedCount / AGENTS.length) * 100)

  // ── Mini floating pill (modal hidden but run still active) ─────────────────

  if (!isOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="fixed bottom-6 right-6 z-50 glass-card rounded-2xl shadow-xl
                   flex items-center gap-3 px-4 py-3 min-w-[260px]"
      >
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${
          runStatus === "completed" ? "bg-green-500" :
          runStatus === "failed"    ? "bg-red-500"   :
          "bg-blue-500 animate-pulse"
        }`} />

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground leading-none mb-0.5">
            {runStatus === "completed" ? "Pipeline complete" :
             runStatus === "failed"    ? "Pipeline failed"   :
             `Agent ${currentAgent + 1} / ${AGENTS.length}`}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {runStatus === "completed"
              ? `${productsProcessed} product${productsProcessed !== 1 ? "s" : ""} processed`
              : runStatus === "failed"
              ? errorMsg
              : `Product ${Math.min(productsProcessed + 1, totalProducts)} of ${totalProducts}`}
          </p>
        </div>

        {/* Expand button */}
        <button
          onClick={onClose}   // parent toggles isOpen back to true
          className="shrink-0 flex items-center gap-1.5 text-[11px] font-medium
                     text-primary hover:text-primary/80 transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Resume
        </button>

        {/* Dismiss when done */}
        {runStatus !== "running" && (
          <button
            onClick={onDone}
            className="shrink-0 p-1 rounded-md hover:bg-muted/60 text-muted-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </motion.div>
    )
  }

  // ── Full modal ─────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        className="glass-card rounded-2xl w-full max-w-2xl max-h-[90vh]
                   flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <h2 className="text-base font-semibold">AI Pricing Pipeline</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Product {Math.min(productsProcessed + 1, totalProducts)} of {totalProducts}
              {runStatus === "completed" && " — Complete"}
              {runStatus === "failed"    && " — Failed"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <motion.span
              key={runStatus}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                runStatus === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                : runStatus === "failed"  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                :                          "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              }`}
            >
              {runStatus === "completed" ? "Completed" : runStatus === "failed" ? "Failed" : "Running"}
            </motion.span>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground
                         hover:text-foreground transition-colors"
              title="Minimise"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="px-6 pt-3 pb-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-muted-foreground">
              Agents {completedCount} / {AGENTS.length}
            </span>
            <span className="text-[11px] font-medium text-foreground">{progressPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                runStatus === "failed"    ? "bg-red-500"   :
                runStatus === "completed" ? "bg-green-500" : "bg-blue-500"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        {/* ── Agent list ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <LayoutGroup>
            <ul className="space-y-1">
              {AGENTS.map((agent, idx) => {
                const status     = agentStatuses[idx]
                const isExpanded = expandedAgents.includes(agent.id)
                const isActive   = status === "in-progress"
                const AgentIcon  = agent.Icon

                return (
                  <motion.li
                    key={agent.id}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: idx * 0.06 }}
                  >
                    {/* Agent row */}
                    <motion.div
                      className={`flex items-center px-3 py-2 rounded-xl cursor-pointer transition-colors
                        ${isActive ? "bg-blue-50/60 dark:bg-blue-900/20" : "hover:bg-muted/40"}`}
                      onClick={() => toggleAgent(agent.id)}
                      whileHover={{ x: 2, transition: { type: "spring", stiffness: 400, damping: 30 } }}
                    >
                      <div className="mr-3 shrink-0">
                        <StatusIcon status={status} />
                      </div>

                      <motion.div
                        className={`w-8 h-8 ${agent.color} rounded-lg flex items-center justify-center
                                   shrink-0 mr-3 shadow-sm`}
                        animate={isActive
                          ? { scale: [1, 1.06, 1], transition: { repeat: Infinity, duration: 1.8, ease: "easeInOut" } }
                          : { scale: 1 }}
                      >
                        <AgentIcon className="h-4 w-4 text-white" />
                      </motion.div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-none mb-0.5 ${
                          status === "completed" ? "text-muted-foreground line-through" : "text-foreground"
                        }`}>
                          {agent.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{agent.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <motion.span
                          key={status}
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_BADGE[status]}`}
                        >
                          {status}
                        </motion.span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ type: "spring", stiffness: 320, damping: 26 }}
                        >
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </motion.div>
                      </div>
                    </motion.div>

                    {/* Expanded tools */}
                    <AnimatePresence mode="wait">
                      {isExpanded && (
                        <motion.div
                          variants={subtaskListVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          className="relative overflow-hidden"
                          layout
                        >
                          <div className="absolute top-0 bottom-0 left-[26px] border-l-2 border-dashed border-muted-foreground/25" />
                          <ul className="mt-1 ml-3 mr-2 mb-2 space-y-0.5">
                            {agent.tools.map((tool) => {
                              const toolKey      = `${agent.id}-${tool.id}`
                              const toolExpanded = expandedTools[toolKey]
                              return (
                                <motion.li
                                  key={tool.id}
                                  variants={subtaskRowVariants}
                                  initial="hidden"
                                  animate="visible"
                                  exit="exit"
                                  className="pl-6 py-0.5"
                                  layout
                                >
                                  <motion.div
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer
                                               hover:bg-muted/40 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); toggleTool(toolKey) }}
                                    whileHover={{ backgroundColor: "rgba(0,0,0,0.03)" }}
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                                    <code className="text-[11px] font-mono text-foreground/80 flex-1">{tool.name}</code>
                                    <ChevronDown className={`h-3 w-3 text-muted-foreground/50 transition-transform ${toolExpanded ? "rotate-180" : ""}`} />
                                  </motion.div>
                                  <AnimatePresence>
                                    {toolExpanded && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2, ease: [0.2, 0.65, 0.3, 0.9] as const }}
                                        className="overflow-hidden pl-5 pb-1"
                                      >
                                        <p className="text-[11px] text-muted-foreground pl-2 border-l border-dashed border-muted-foreground/25">
                                          {tool.description}
                                        </p>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </motion.li>
                              )
                            })}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                )
              })}
            </ul>
          </LayoutGroup>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-border/40 flex items-center justify-between gap-3">
          {runStatus === "failed" && (
            <p className="text-xs text-red-600 dark:text-red-400 flex-1 truncate">{errorMsg}</p>
          )}
          {runStatus !== "failed" && (
            <p className="text-xs text-muted-foreground flex-1">
              {runStatus === "completed"
                ? `${productsProcessed} product${productsProcessed !== 1 ? "s" : ""} processed`
                : `Agent ${currentAgent + 1} of ${AGENTS.length} running`}
            </p>
          )}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-lg border border-border
                         hover:bg-muted/60 transition-colors"
            >
              Hide
            </button>
            {runStatus === "completed" && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleViewResults}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground
                           hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                View Recommendations
                <ExternalLink className="h-3 w-3" />
              </motion.button>
            )}
            {runStatus === "failed" && (
              <button
                onClick={onDone}
                className="text-xs px-3 py-1.5 rounded-lg border border-border
                           hover:bg-muted/60 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
