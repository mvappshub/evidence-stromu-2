'use client'

import { create } from 'zustand'

interface AuthUser {
  id: string
  email: string
  name: string | null
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  setAuth: (user: AuthUser) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user) => {
    set({ user, isAuthenticated: true, isLoading: false })
  },

  clearAuth: () => {
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (loading) => set({ isLoading: loading }),

  hydrate: async () => {
    if (typeof window === 'undefined') return

    try {
      const res = await fetch('/api/auth/me')

      if (!res.ok) {
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      const data = (await res.json()) as { user: AuthUser }
      set({ user: data.user, isAuthenticated: true, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
