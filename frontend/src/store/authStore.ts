/**
 * store/authStore.ts — Global auth state using Zustand.
 *
 * Stores: access token, refresh token, current user.
 * Persists to localStorage so login survives page refresh.
 *
 * Why Zustand instead of React Context?
 *   Zustand has no Provider boilerplate, works outside React components
 *   (needed in api.ts interceptor), and avoids unnecessary re-renders.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/auth'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null

  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setAccessToken: (token: string) => void   // called by refresh interceptor
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      setAccessToken: (accessToken) =>
        set({ accessToken }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null }),

      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: 'klypup-auth',      // localStorage key
      partialize: (state) => ({
        // Only persist tokens — user data is re-fetched on app load
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
)
