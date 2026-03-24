/**
 * KINGSTAR · IO — Auth Store (Zustand)
 * Estado global de autenticação.
 * Persiste token no localStorage para sobreviver ao refresh.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  /* Actions */
  setAuth:  (token: string, user: User) => void
  logout:   () => void
  setUser:  (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:           null,
      user:            null,
      isAuthenticated: false,

      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true }),

      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),

      setUser: (user) =>
        set({ user }),
    }),
    {
      name: 'ks-auth', /* chave no localStorage */
      partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
)
