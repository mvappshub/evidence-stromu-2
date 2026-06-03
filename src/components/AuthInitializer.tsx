'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { initAuthInterceptor } from '@/lib/auth-interceptor'

/**
 * Initializes auth state and fetch interceptor.
 * Must be rendered early in the component tree.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate)

  useEffect(() => {
    // Initialize the fetch interceptor first
    initAuthInterceptor()
    // Then hydrate auth state from localStorage
    void hydrate()
  }, [hydrate])

  return <>{children}</>
}
