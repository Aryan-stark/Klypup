/**
 * Sidebar.tsx — Left navigation with glassmorphism.
 * Shows Settings / Team links only for admin role.
 */
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Lightbulb, ClipboardList,
  Settings, Users, PlayCircle, Zap,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard',       label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/products',        label: 'Products',        icon: Package },
  { to: '/recommendations', label: 'Recommendations', icon: Lightbulb },
  { to: '/runs',            label: 'Runs',            icon: PlayCircle },
  { to: '/audit',           label: 'Audit Trail',     icon: ClipboardList },
]

const adminItems = [
  { to: '/users',    label: 'Team',     icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)

  return (
    <aside className="glass-sidebar w-56 flex flex-col py-5 px-3 shrink-0">
      {/* Logo */}
      <div className="mb-7 px-3 flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none tracking-tight">Klypup</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">Pricing Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 mt-1">
          Navigation
        </p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 mt-5">
              Admin
            </p>
            {adminItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }: { isActive: boolean }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom org badge */}
      <div className="mt-4 px-3">
        <div className="rounded-lg border border-border/50 bg-muted/40 px-3 py-2">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Org</p>
          <p className="text-xs font-semibold text-foreground truncate mt-0.5">
            {user?.org_id?.slice(-8) ?? '—'}
          </p>
        </div>
      </div>
    </aside>
  )
}
