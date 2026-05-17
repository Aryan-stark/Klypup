/**
 * PrivateRoute.tsx — Redirects to /login if user is not authenticated.
 * Wraps all protected routes in App.tsx.
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function PrivateRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
