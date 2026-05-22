import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from '@/components/layout/PrivateRoute'
import RoleGuard from '@/components/layout/RoleGuard'
import DashboardLayout from '@/components/layout/DashboardLayout'
import LoadingSpinner from '@/components/common/LoadingSpinner'

const Login              = lazy(() => import('@/pages/Login'))
const Join               = lazy(() => import('@/pages/Join'))
const Dashboard          = lazy(() => import('@/pages/Dashboard'))
const Products           = lazy(() => import('@/pages/Products'))
const ProductDetail      = lazy(() => import('@/pages/ProductDetail'))
const Recommendations    = lazy(() => import('@/pages/Recommendations'))
const RecommendationDetail = lazy(() => import('@/pages/RecommendationDetail'))
const Audit              = lazy(() => import('@/pages/Audit'))
const Settings           = lazy(() => import('@/pages/Settings'))
const Users              = lazy(() => import('@/pages/Users'))
const Runs               = lazy(() => import('@/pages/Runs'))
const NotFound           = lazy(() => import('@/pages/NotFound'))

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Suspense fallback={null}><Login /></Suspense>} />
      <Route path="/join"  element={<Suspense fallback={<LoadingSpinner />}><Join /></Suspense>} />

      {/* Protected — DashboardLayout owns Suspense for inner pages */}
      <Route element={<PrivateRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"        element={<Dashboard />} />
          <Route path="/products"         element={<Products />} />
          <Route path="/products/:id"     element={<ProductDetail />} />
          <Route path="/recommendations"  element={<Recommendations />} />
          <Route path="/recommendations/:id" element={<RecommendationDetail />} />
          <Route path="/audit"            element={<Audit />} />
          <Route path="/runs"             element={<Runs />} />

          <Route element={<RoleGuard allowedRoles={['admin']} />}>
            <Route path="/settings" element={<Settings />} />
            <Route path="/users"    element={<Users />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Suspense fallback={null}><NotFound /></Suspense>} />
    </Routes>
  )
}
