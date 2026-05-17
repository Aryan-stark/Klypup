/**
 * App.tsx — Root router. Defines every page route in the application.
 *
 * Route structure:
 *   /login                  → Login page (public)
 *   /                       → Protected: requires login
 *     /dashboard            → Dashboard home
 *     /products             → Product catalog
 *     /products/:id         → Product detail
 *     /recommendations      → Recommendation queue
 *     /recommendations/:id  → Recommendation detail (agent reasoning)
 *     /audit                → Audit trail
 *     /settings             → Admin config panel (admin role required)
 *   *                       → 404
 *
 * PrivateRoute: redirects to /login if no valid token in authStore
 * RoleGuard:    redirects to /dashboard if user lacks required role
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from '@/components/layout/PrivateRoute'
import RoleGuard from '@/components/layout/RoleGuard'
import DashboardLayout from '@/components/layout/DashboardLayout'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Products from '@/pages/Products'
import ProductDetail from '@/pages/ProductDetail'
import Recommendations from '@/pages/Recommendations'
import RecommendationDetail from '@/pages/RecommendationDetail'
import Audit from '@/pages/Audit'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected — all inside DashboardLayout (sidebar + topbar) */}
      <Route element={<PrivateRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/recommendations/:id" element={<RecommendationDetail />} />
          <Route path="/audit" element={<Audit />} />

          {/* Admin only */}
          <Route element={<RoleGuard allowedRoles={['admin']} />}>
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
