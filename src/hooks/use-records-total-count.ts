'use client'

import { useQuery } from '@tanstack/react-query'

/** Unfiltered record count for the signed-in user (single shared query key). */
export function useRecordsTotalCount() {
  return useQuery({
    queryKey: ['records-count'],
    queryFn: async () => {
      const res = await fetch('/api/records?limit=1')
      if (!res.ok) throw new Error('Failed to fetch record count')
      const data = await res.json()
      return data.count as number
    },
    staleTime: 30_000,
  })
}
