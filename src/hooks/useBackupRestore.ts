'use client'

import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invalidateRecordsDomain } from '@/lib/query-invalidation'

export function useBackupRestore(
  onRestoreSettled: () => void,
  onStudioLoadingChange: (loading: boolean) => void,
) {
  const queryClient = useQueryClient()

  const handleDownload = useCallback(async () => {
    try {
      const res = await fetch('/api/records/backup')
      if (!res.ok) throw new Error('Chyba při stahování zálohy')
      const data = await res.json()

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stromy-zaloha-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Záloha stažena', {
        description: `${data.records?.length ?? 0} záznamů`,
      })
    } catch {
      toast.error('Nepodařilo se stáhnout zálohu')
    }
  }, [])

  const restoreMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text()
      const data = JSON.parse(text)
      const res = await fetch('/api/records/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Chyba při obnově')
      }
      return res.json()
    },
    onSuccess: async (data) => {
      await invalidateRecordsDomain(queryClient, {
        includeCount: true,
        includeFilters: true,
        includeStats: true,
        includeActivityLog: true,
      })
      toast.success('Data obnovena', { description: `${data.restored} záznamů` })
      onRestoreSettled()
    },
    onError: (error) => {
      toast.error('Chyba při obnově', {
        description: error instanceof Error ? error.message : undefined,
      })
      onRestoreSettled()
    },
  })

  const handleOpenPrismaStudio = useCallback(async () => {
    onStudioLoadingChange(true)
    try {
      const res = await fetch('/api/dev/prisma-studio', { method: 'POST' })
      const data = (await res.json()) as { url?: string; error?: string; started?: boolean }
      if (!res.ok) throw new Error(data.error ?? 'Nepodařilo se spustit Prisma Studio')
      if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer')
      toast.success(data.started ? 'Prisma Studio spuštěno' : 'Prisma Studio otevřeno')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Spusťte: bun run db:studio'
      )
    } finally {
      onStudioLoadingChange(false)
    }
  }, [onStudioLoadingChange])

  return {
    handleDownload,
    restoreMutation,
    handleOpenPrismaStudio,
  }
}
