'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Initializes auth state from the cookie-backed session.
 * Must be rendered early in the component tree.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return <>{children}</>
}
