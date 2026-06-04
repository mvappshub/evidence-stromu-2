'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invalidateRecordsDomain } from '@/lib/query-invalidation'

type BulkNoteValues = {
  note: string
}

type BulkEditValues = {
  speciesLatin?: string
  locality?: string
  plantedAt?: string
}

export function useBulkRecordActions(
  selectedRecordNumbers: number[],
  onClearSelection: () => void,
  onNoteSuccess: () => void,
  onEditSuccess: () => void,
) {
  const queryClient = useQueryClient()

  const bulkNoteMutation = useMutation({
    mutationFn: async (data: BulkNoteValues) => {
      const res = await fetch('/api/records/bulk/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordNumbers: selectedRecordNumbers,
          note: data.note,
        }),
      })
      if (!res.ok) throw new Error('Chyba při přidávání poznámky')
      return res.json()
    },
    onSuccess: async () => {
      await invalidateRecordsDomain(queryClient, {
        includeStats: true,
        includeActivityLog: true,
      })
      onNoteSuccess()
      onClearSelection()
      toast.success('Poznámka přidána', {
        description: `Přidáno k ${selectedRecordNumbers.length} záznamům`,
      })
    },
    onError: () => {
      toast.error('Chyba při přidávání poznámky')
    },
  })

  const bulkEditMutation = useMutation({
    mutationFn: async (data: BulkEditValues) => {
      const payload: {
        recordNumbers: number[]
        speciesLatin?: string
        locality?: string | null
        plantedAt?: string
      } = {
        recordNumbers: selectedRecordNumbers,
      }
      if (data.speciesLatin && data.speciesLatin.trim()) {
        payload.speciesLatin = data.speciesLatin.trim()
      }
      if (data.locality !== undefined && data.locality.trim() !== '') {
        payload.locality = data.locality.trim()
      }
      if (data.plantedAt) {
        payload.plantedAt = data.plantedAt
      }
      const res = await fetch('/api/records/bulk/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Chyba při hromadné úpravě')
      return res.json()
    },
    onSuccess: async () => {
      await invalidateRecordsDomain(queryClient, {
        includeStats: true,
        includeActivityLog: true,
      })
      onEditSuccess()
      onClearSelection()
      toast.success('Záznamy upraveny')
    },
    onError: () => {
      toast.error('Chyba při hromadné úpravě')
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/records/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordNumbers: selectedRecordNumbers }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Chyba při mazání')
      }
      return res.json() as Promise<{ deleted: number }>
    },
    onSuccess: async (data) => {
      await invalidateRecordsDomain(queryClient, {
        includeCount: true,
        includeFilters: true,
        includeStats: true,
        includeActivityLog: true,
      })
      onClearSelection()
      toast.success('Záznamy smazány', {
        description: `${data.deleted} záznamů odstraněno`,
      })
    },
    onError: (error) => {
      toast.error('Chyba při mazání', {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  return {
    bulkNoteMutation,
    bulkEditMutation,
    bulkDeleteMutation,
  }
}
