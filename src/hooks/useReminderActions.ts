'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invalidateRecordsDomain, invalidateReminderDomain } from '@/lib/query-invalidation'

export type ReminderFormValues = {
  text: string
  mode: 'interval' | 'date'
  intervalNum?: number
  intervalUnit?: 'day' | 'week' | 'month' | 'year'
  startAt?: string
  dueAt?: string
  active: boolean
}

type ReminderActionsOptions = {
  recordNumber: number
  recordNumbers?: number[]
  onAfterSubmit?: () => void
  onAfterUpdate?: () => void
}

export function useReminderActions({
  recordNumber,
  recordNumbers,
  onAfterSubmit,
  onAfterUpdate,
}: ReminderActionsOptions) {
  const queryClient = useQueryClient()
  const isBulk = !!recordNumbers && recordNumbers.length > 0

  const createMutation = useMutation({
    mutationFn: async (data: ReminderFormValues) => {
      const endpoint = isBulk ? '/api/records/bulk/reminder' : '/api/reminders'
      const payload = isBulk
        ? {
            recordNumbers,
            text: data.text,
            mode: data.mode,
            intervalNum: data.mode === 'interval' ? data.intervalNum : undefined,
            intervalUnit: data.mode === 'interval' ? data.intervalUnit : undefined,
            startAt: data.startAt || undefined,
            dueAt: data.mode === 'date' ? data.dueAt : undefined,
          }
        : {
            recordNumber,
            text: data.text,
            mode: data.mode,
            intervalNum: data.mode === 'interval' ? data.intervalNum : undefined,
            intervalUnit: data.mode === 'interval' ? data.intervalUnit : undefined,
            startAt: data.startAt || undefined,
            dueAt: data.mode === 'date' ? data.dueAt : undefined,
          }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Chyba při vytváření připomínky')
      return res.json()
    },
    onSuccess: async () => {
      await invalidateRecordsDomain(queryClient)
      onAfterSubmit?.()
      toast.success('Připomínka vytvořena')
    },
    onError: (error) => {
      toast.error('Chyba', {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReminderFormValues> }) => {
      const res = await fetch(`/api/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Chyba při úpravě připomínky')
      return res.json()
    },
    onSuccess: async () => {
      await invalidateRecordsDomain(queryClient)
      onAfterUpdate?.()
      toast.success('Připomínka aktualizována')
    },
    onError: (error) => {
      toast.error('Chyba', {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reminders/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Chyba při mazání připomínky')
      return res.json()
    },
    onSuccess: async () => {
      await invalidateRecordsDomain(queryClient)
      onAfterUpdate?.()
      toast.success('Připomínka smazána')
    },
    onError: (error) => {
      toast.error('Chyba', {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reminders/${id}/ack`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Chyba při potvrzení připomínky')
      return res.json()
    },
    onSuccess: async () => {
      await invalidateReminderDomain(queryClient)
      onAfterUpdate?.()
      toast.success('Připomínka vyřízena')
    },
    onError: (error) => {
      toast.error('Chyba', {
        description: error instanceof Error ? error.message : undefined,
      })
    },
  })

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    ackMutation,
  }
}
