/**
 * lib/api.ts — Axios instance with JWT interceptor.
 *
 * What this does:
 *   1. Attaches Authorization: Bearer <token> to every request automatically
 *   2. On 401 response: tries to refresh the access token, then retries the request
 *   3. On refresh failure: clears auth state and redirects to /login
 *
 * Why a single Axios instance?
 *   All services import this — token handling is in one place only.
 *   No service file needs to manually attach the Authorization header.
 */
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach current access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 → attempt token refresh → retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = useAuthStore.getState().refreshToken

      if (refreshToken) {
        try {
          const res = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refresh_token: refreshToken }
          )
          const { access_token } = res.data.data
          useAuthStore.getState().setAccessToken(access_token)
          original.headers.Authorization = `Bearer ${access_token}`
          return api(original)    // retry the failed request with new token
        } catch {
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api
