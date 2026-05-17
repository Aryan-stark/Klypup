/**
 * Topbar.tsx — Top navigation bar with user menu and logout.
 */
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'

export default function Topbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {user?.full_name} · <span className="capitalize">{user?.role?.replace('_', ' ')}</span>
        </span>
        <button
          onClick={logout}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
