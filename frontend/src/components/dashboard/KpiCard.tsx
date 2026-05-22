import { useEffect, type ReactNode } from 'react'
import { useMotionValue, useSpring, useTransform, motion } from 'framer-motion'

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 80, damping: 18 })
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString())

  useEffect(() => { motionValue.set(value) }, [value, motionValue])

  return <motion.span>{display}</motion.span>
}

interface Props {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
}

export default function KpiCard({ label, value, sub, icon }: Props) {
  return (
    <div className="glass-card rounded-lg p-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className="text-3xl font-bold tracking-tight">
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}
