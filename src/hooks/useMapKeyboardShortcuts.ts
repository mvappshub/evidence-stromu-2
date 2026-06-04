'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateRecordsDomain } from '@/lib/query-invalidation'

type UseMapKeyboardShortcutsArgs = {
  lastInsertedRecordNumber: number | null
  setLastInsertedRecordNumber: (value: number | null) => void
}

export function useMapKeyboardShortcuts({
  lastInsertedRecordNumber,
  setLastInsertedRecordNumber,
}: UseMapKeyboardShortcutsArgs) {
  const queryClient = useQueryClient()
  const [gridVisible, setGridVisible] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 'z' &&
        lastInsertedRecordNumber != null
      ) {
        e.preventDefault()
        fetch(`/api/records/${lastInsertedRecordNumber}`, { method: 'DELETE' }).then(async () => {
          setLastInsertedRecordNumber(null)
          await invalidateRecordsDomain(queryClient)
        })
      }
      if (
        e.key === 'g' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        setGridVisible((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lastInsertedRecordNumber, setLastInsertedRecordNumber, queryClient])

  return { gridVisible }
}
