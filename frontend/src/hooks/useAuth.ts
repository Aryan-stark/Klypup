/**
 * hooks/useAuth.ts — Auth mutations (login, signup, logout).
 *
 * Uses React Query useMutation for login/signup so the UI
 * gets loading/error states automatically.
 */
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import type { LoginRequest, SignupRequest } from '@/types/auth'

export function useLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: async (res) => {
      const { access_token, refresh_token } = res.data
      // Fetch user profile with the new token
      // (temporarily set token so api.ts interceptor can attach it)
      useAuthStore.getState().setAccessToken(access_token)
      const me = await authService.me()
      setAuth(me.data, access_token, refresh_token)
      navigate('/dashboard')
    },
  })
}

export function useSignup() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: (data: SignupRequest) => authService.signup(data),
    onSuccess: async (res) => {
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

  return () => {
    if (refreshToken) authService.logout(refreshToken).catch(() => {})
    logout()
    navigate('/login')
  }
}
