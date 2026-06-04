'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUiStore } from '@/store/useUiStore'
import type { TreeRecord } from '@/lib/types'
import { invalidateRecordsDomain } from '@/lib/query-invalidation'

export type RecordEditDraft = {
  speciesLatin: string
  plantedAt: string
  lat: number
  lng: number
  locality: string
  note: string
  photoPath: string | null
}

function toDraft(record: TreeRecord): RecordEditDraft {
  return {
    speciesLatin: record.speciesLatin,
    plantedAt: record.plantedAt.slice(0, 10),
    lat: record.lat,
    lng: record.lng,
    locality: record.locality ?? '',
    note: record.note ?? '',
    photoPath: record.photoPath,
  }
}

export function useRecordEditDraft(record: TreeRecord | null) {
  const queryClient = useQueryClient()
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const recordNumber = record?.recordNumber ?? null
  const [draftState, setDraftState] = useState<{
    recordNumber: number | null
    draft: RecordEditDraft | null
  }>(() => ({
    recordNumber,
    draft: record ? toDraft(record) : null,
  }))
  const draft =
    draftState.recordNumber === recordNumber
      ? draftState.draft
      : record
        ? toDraft(record)
        : null

  const patchField = useCallback(<K extends keyof RecordEditDraft>(key: K, value: RecordEditDraft[K]) => {
    setDraftState((state) => {
      const currentDraft =
        state.recordNumber === recordNumber
          ? state.draft
          : record
            ? toDraft(record)
            : null

      return {
        recordNumber,
        draft: currentDraft ? { ...currentDraft, [key]: value } : currentDraft,
      }
    })
  }, [record, recordNumber])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!record || !draft) throw new Error('No record')
      const res = await fetch(`/api/records/${record.recordNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speciesLatin: draft.speciesLatin,
          plantedAt: draft.plantedAt,
          lat: draft.lat,
          lng: draft.lng,
          locality: draft.locality || null,
          note: draft.note || null,
          photoPath: draft.photoPath,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      return res.json()
    },
    onSuccess: async () => {
      await invalidateRecordsDomain(queryClient, {
        includeRecord: record?.recordNumber ?? null,
      })
      toast.success(`#${record?.recordNumber} uloženo`)
    },
    onError: () => toast.error('Uložení se nezdařilo'),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!record) throw new Error('No record')
      const res = await fetch(`/api/records/${record.recordNumber}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: async () => {
      await invalidateRecordsDomain(queryClient)
      setSelectedRecordNumber(null)
      toast.success('Záznam smazán')
    },
    onError: () => toast.error('Smazání se nezdařilo'),
  })

  return {
    draft,
    patchField,
    save: () => saveMutation.mutate(),
    isSaving: saveMutation.isPending,
    remove: () => deleteMutation.mutate(),
    isDeleting: deleteMutation.isPending,
  }
}

export type RecordsTableMeta = {
  editingRecordNumber: number | null
  isEditing: (recordNumber: number) => boolean
  draft: RecordEditDraft | null
  patchField: <K extends keyof RecordEditDraft>(key: K, value: RecordEditDraft[K]) => void
  save: () => void
  isSaving: boolean
  remove: () => void
}
