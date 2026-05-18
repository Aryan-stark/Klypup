/**
 * Sidebar.tsx — Left navigation.
 * Shows/hides Settings link based on user role.
 */
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Lightbulb, ClipboardList, Settings, Users, PlayCircle,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard',       label: 'Dashboard',        icon: LayoutDashboard },
  { to: '/products',        label: 'Products',         icon: Package },
  { to: '/recommendations', label: 'Recommendations',  icon: Lightbulb },
  { to: '/runs',            label: 'Runs',             icon: PlayCircle },
  { to: '/audit',           label: 'Audit Trail',      icon: ClipboardList },
]

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)

  return (
    <aside className="w-56 border-r bg-card flex flex-col py-4 px-3">
      <div className="mb-6 px-2">
        <span className="text-lg font-bold">Klypup</span>
        <p className="text-xs text-muted-foreground truncate">{user?.org_id}</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground')
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <NavLink
              to="/users"
              className={({ isActive }: { isActive: boolean }) =>
                cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground')
              }
            >
              <Users className="h-4 w-4" />
              Team
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }: { isActive: boolean }) =>
                cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground')
              }
            >
              <Settings className="h-4 w-4" />
              Settings
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  )
}
