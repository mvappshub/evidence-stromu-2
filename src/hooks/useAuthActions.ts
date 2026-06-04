'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'

type LoginInput = {
  email: string
  password: string
}

type RegisterInput = LoginInput & {
  name: string
}

type AuthResponse = {
  user?: {
    id: string
    email: string
    name: string | null
  }
  error?: string
}

export function useAuthActions() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const login = useCallback(async ({ email, password }: LoginInput) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const result = (await res.json()) as AuthResponse
    if (!res.ok) {
      throw new Error(result.error || 'Neplatný e-mail nebo heslo')
    }

    if (!result.user) {
      throw new Error('Chybí data uživatele')
    }

    setAuth(result.user)
    return result.user
  }, [setAuth])

  const register = useCallback(async ({ name, email, password }: RegisterInput) => {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })

    const result = (await res.json().catch(() => ({}))) as AuthResponse
    if (!res.ok) {
      if (res.status === 409) {
        throw new Error('Tento e-mail je již registrován')
      }
      throw new Error(result.error || 'Chyba při registraci')
    }

    await login({ email, password })
  }, [login])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearAuth()
  }, [clearAuth])

  const updateProfileName = useCallback((user: NonNullable<AuthResponse['user']>) => {
    setAuth(user)
  }, [setAuth])

  const logoutWithToast = useCallback(async () => {
    try {
      await logout()
    } catch {
      toast.error('Odhlášení se nezdařilo')
    }
  }, [logout])

  return {
    login,
    register,
    logout,
    logoutWithToast,
    updateProfileName,
  }
}
