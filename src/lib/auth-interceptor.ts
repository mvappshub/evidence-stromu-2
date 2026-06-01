'use client'

import { useAuthStore } from '@/store/useAuthStore'

/**
 * Initialize global fetch interceptor that adds Bearer token to all /api/ requests.
 * This ensures all API calls are authenticated via localStorage token,
 * which works reliably in iframe/preview environments where cookies may not persist.
 */
let initialized = false

export function initAuthInterceptor() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  const originalFetch = window.fetch

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Only intercept API calls
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : (input as Request).url

    if (typeof url === 'string' && url.startsWith('/api/')) {
      const token = useAuthStore.getState().token
      if (token) {
        init = init || {}
        const headers = new Headers(init.headers || {})
        headers.set('Authorization', `Bearer ${token}`)
        init.headers = headers
      }
    }

    return originalFetch.call(this, input, init)
  }
}
