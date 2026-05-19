/**
 * Topbar.tsx — Top navigation bar with user info, dark/light toggle, and logout.
 * Uses the curtain ThemeToggle (icon variant) — persists choice to localStorage.
 */
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { ThemeToggle } from '@/components/ui/curtain-theme-toggle'

export default function Topbar() {
  const user   = useAuthStore((s) => s.user)
  const logout = useLogout()

  // Apply saved theme on mount (complements the index.html inline script)
  useEffect(() => {
    const saved = localStorage.getItem('klypup-theme')
    if (saved === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  return (
    <header className="glass-topbar h-14 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Left — breadcrumb / org name placeholder */}
      <div className="text-sm font-medium text-muted-foreground tracking-wide select-none">
        Klypup
        <span className="mx-2 opacity-30">/</span>
        <span className="text-foreground">{user?.org_id?.slice(-6)}</span>
      </div>

      {/* Right — user info + theme toggle + logout */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-sm">
          <span className="font-medium text-foreground">{user?.full_name}</span>
          <span className="text-muted-foreground opacity-50">·</span>
          <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 rounded-full bg-muted">
            {user?.role?.replace('_', ' ')}
          </span>
        </div>

        {/* Curtain theme toggle — saves to localStorage for persistence */}
        <ThemeToggle
          variant="icon"
          buttonSize={30}
          duration={500}
          onThemeChange={(theme) => localStorage.setItem('klypup-theme', theme)}
        />

        <button
          onClick={logout}
          className="text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-md px-3 py-1.5 transition-all duration-150"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
