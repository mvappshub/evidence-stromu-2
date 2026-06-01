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
  hydrate: () => void
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

  hydrate: () => {
    if (typeof window === 'undefined') return
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      const userStr = localStorage.getItem(AUTH_USER_KEY)
      if (token && userStr) {
        const user = JSON.parse(userStr) as AuthUser
        set({ token, user, isAuthenticated: true, isLoading: false })
      } else {
        set({ token: null, user: null, isAuthenticated: false, isLoading: false })
      }
    } catch {
      set({ token: null, user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
