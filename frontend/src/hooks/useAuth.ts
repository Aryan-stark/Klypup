/**
 * hooks/useAuth.ts — Auth mutations (login, signup, logout).
 *
 * Uses React Query useMutation for login/signup so the UI
 * gets loading/error states automatically.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import type { LoginRequest, SignupRequest } from '@/types/auth'

export function useLogin() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const qc       = useQueryClient()

  return useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: async (res) => {
      // Clear any cached data from a previous session BEFORE setting new auth.
      // Without this, React Query serves stale org-scoped data to the new user.
      qc.clear()
      const { access_token, refresh_token } = res.data
      useAuthStore.getState().setAccessToken(access_token)
      const me = await authService.me()
      setAuth(me.data, access_token, refresh_token)
      navigate('/dashboard')
    },
  })
}

export function useSignup() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const qc       = useQueryClient()

  return useMutation({
    mutationFn: (data: SignupRequest) => authService.signup(data),
    onSuccess: async (res) => {
      qc.clear()
      const { access_token, refresh_token } = res.data
      useAuthStore.getState().setAccessToken(access_token)
      const me = await authService.me()
      setAuth(me.data, access_token, refresh_token)
      navigate('/dashboard')
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const { refreshToken, logout } = useAuthStore()
  const qc = useQueryClient()

  return () => {
    if (refreshToken) authService.logout(refreshToken).catch(() => {})
    logout()
    // Wipe all org-scoped cached queries so the next login starts clean
    qc.clear()
    navigate('/login')
  }
}
