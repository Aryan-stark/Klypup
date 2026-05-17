/**
 * services/authService.ts — Auth API calls.
 * Each function maps to one backend route.
 * Imported by useAuth hook.
 */
import api from '@/lib/api'
import type { LoginRequest, SignupRequest, TokenResponse, User } from '@/types/auth'
import type { ApiResponse } from '@/types/api'

export const authService = {
  async login(data: LoginRequest): Promise<ApiResponse<TokenResponse>> {
    const res = await api.post('/auth/login', data)
    return res.data
  },

  async signup(data: SignupRequest): Promise<ApiResponse<TokenResponse>> {
    const res = await api.post('/auth/signup', data)
    return res.data
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refresh_token: refreshToken })
  },

  async me(): Promise<ApiResponse<User>> {
    const res = await api.get('/auth/me')
    return res.data
  },
}
