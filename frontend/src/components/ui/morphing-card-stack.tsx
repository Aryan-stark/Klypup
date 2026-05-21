import { useState, type ReactNode } from "react"
import { motion, AnimatePresence, LayoutGroup, type PanInfo } from "framer-motion"
import { cn } from "@/lib/utils"
import { Grid3X3, Layers, LayoutList } from "lucide-react"

export type LayoutMode = "stack" | "grid" | "list"

export interface CardData {
  id: string
  title: string
  description: string
  icon?: ReactNode
  color?: string
}

export interface MorphingCardStackProps {
  cards?: CardData[]
  className?: string
  defaultLayout?: LayoutMode
  onCardClick?: (card: CardData) => void
  /** Override default card content. Receives the card data and current layout mode. */
  renderCard?: (card: CardData, layout: LayoutMode) => ReactNode
}

const layoutIcons = {
  stack: Layers,
  grid: Grid3X3,
  list: LayoutList,
}

const SWIPE_THRESHOLD = 50

export function MorphingCardStack({
  cards = [],
  className,
  defaultLayout = "stack",
  onCardClick,
  renderCard,
}: MorphingCardStackProps) {
  const [layout, setLayout] = useState<LayoutMode>(defaultLayout)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  if (!cards || cards.length === 0) return null

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info
    const swipe = Math.abs(offset.x) * velocity.x
    if (offset.x < -SWIPE_THRESHOLD || swipe < -1000) {
      setActiveIndex((prev) => (prev + 1) % cards.length)
    } else if (offset.x > SWIPE_THRESHOLD || swipe > 1000) {
      setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length)
    }
    setIsDragging(false)
  }

  const getStackOrder = () => {
    const reordered = []
    for (let i = 0; i < cards.length; i++) {
      const index = (activeIndex + i) % cards.length
      reordered.push({ ...cards[index], stackPosition: i })
    }
    return reordered.reverse()
  }

  const getLayoutStyles = (stackPosition: number) => {
    switch (layout) {
      case "stack":
        return {
          top: stackPosition * 8,
          left: stackPosition * 8,
          zIndex: cards.length - stackPosition,
          rotate: (stackPosition - 1) * 2,
        }
      default:
        return { top: 0, left: 0, zIndex: 1, rotate: 0 }
    }
  }

  const containerStyles: Record<LayoutMode, string> = {
    stack: "relative h-56 w-64",
    grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full",
    list: "flex flex-col gap-3 w-full",
  }

  const displayCards = layout === "stack"
    ? getStackOrder()
    : cards.map((c, i) => ({ ...c, stackPosition: i }))

  return (
    <div className={cn("space-y-4", className)}>
      {/* Layout Toggle */}
      <div className="flex items-center justify-end gap-1 rounded-lg bg-secondary/50 p-1 w-fit ml-auto">
        {(Object.keys(layoutIcons) as LayoutMode[]).map((mode) => {
          const Icon = layoutIcons[mode]
          return (
            <button
              key={mode}
              onClick={() => setLayout(mode)}
              className={cn(
                "rounded-md p-2 transition-all",
                layout === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
              aria-label={`Switch to ${mode} layout`}
            >
              <Icon className="h-4 w-4" />
            </button>
          )
        })}
      </div>

      {/* Cards Container */}
      <LayoutGroup>
        <motion.div
          layout
          className={cn(
            containerStyles[layout],
            layout === "stack" && "mx-auto",
          )}
        >
          <AnimatePresence mode="popLayout">
            {displayCards.map((card) => {
              const styles = getLayoutStyles(card.stackPosition)
              const isExpanded = expandedCard === card.id
              const isTopCard = layout === "stack" && card.stackPosition === 0

              return (
                <motion.div
                  key={card.id}
                  layoutId={card.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: isExpanded ? 1.02 : 1,
                    x: 0,
                    ...styles,
                  }}
                  exit={{ opacity: 0, scale: 0.8, x: -200 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  drag={isTopCard ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={handleDragEnd}
                  whileDrag={{ scale: 1.02, cursor: "grabbing" }}
                  onClick={() => {
                    if (isDragging) return
                    setExpandedCard(isExpanded ? null : card.id)
                    onCardClick?.(card)
                  }}
                  className={cn(
                    "cursor-pointer rounded-xl border border-border bg-card p-4 overflow-hidden",
                    "hover:border-primary/50 transition-colors",
                    layout === "stack" && "absolute w-56 h-52",
                    layout === "stack" && isTopCard && "cursor-grab active:cursor-grabbing",
                    layout === "list" && "w-full",
                    isExpanded && "ring-2 ring-primary",
                  )}
                  style={{ backgroundColor: card.color || undefined }}
                >
                  {renderCard ? (
                    renderCard(card, layout)
                  ) : (
                    <div className="flex items-start gap-3">
                      {card.icon && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                          {card.icon}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-card-foreground truncate">{card.title}</h3>
                        <p className={cn(
                          "text-sm text-muted-foreground mt-1",
                          layout === "stack" ? "line-clamp-3" : "line-clamp-2",
                        )}>
                          {card.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {isTopCard && (
                    <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                      <span className="text-xs text-muted-foreground/40">Swipe to navigate</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {layout === "stack" && cards.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-2">
          {cards.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === activeIndex
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50",
              )}
              aria-label={`Go to card ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
