'use client'

import { create } from 'zustand'

interface AuthUser {
  id: string
  email: string
  name: string | null
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  setAuth: (token: string, user: AuthUser) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  hydrate: () => Promise<void>
}

const AUTH_TOKEN_KEY = 'auth-token'
const AUTH_USER_KEY = 'auth-user'

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading=true to prevent flash

  setAuth: (token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
    }
    set({ token, user, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_USER_KEY)
    }
    set({ token: null, user: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (loading) => set({ isLoading: loading }),

  hydrate: async () => {
    if (typeof window === 'undefined') return

    const clearSession = () => {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_USER_KEY)
      set({ token: null, user: null, isAuthenticated: false, isLoading: false })
    }

    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) {
        clearSession()
        return
      }

      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        clearSession()
        return
      }

      const data = (await res.json()) as { user: AuthUser }
      localStorage.setItem(AUTH_TOKEN_KEY, token)
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user))
      set({ token, user: data.user, isAuthenticated: true, isLoading: false })
    } catch {
      clearSession()
    }
  },
}))
