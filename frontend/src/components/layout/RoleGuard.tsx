/**
 * RoleGuard.tsx — Redirects to /dashboard if user lacks the required role.
 * Used for the Settings page (admin only).
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types/auth'

interface Props {
  allowedRoles: UserRole[]
}

export default function RoleGuard({ allowedRoles }: Props) {
  const user = useAuthStore((s) => s.user)
  if (!user || !allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}
