'use client'

import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Database, Download, Upload } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'

export function BackupRestore() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const queryClient = useQueryClient()

  // Download backup
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
        description: `${data.records?.length ?? 0} záznamů exportováno`,
      })
    } catch {
      toast.error('Chyba', { description: 'Nepodařilo se stáhnout zálohu' })
    }
  }, [])

  // Restore mutation
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
    onSuccess: (data) => {
      toast.success('Data obnovena', {
        description: `${data.restored} záznamů obnoveno ze zálohy`,
      })
      // Invalidate all queries
      queryClient.invalidateQueries()
      setConfirmOpen(false)
      setPendingFile(null)
    },
    onError: (error) => {
      toast.error('Chyba při obnově', { description: error.message })
      setConfirmOpen(false)
      setPendingFile(null)
    },
  })

  // File picker change handler
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPendingFile(file)
      setConfirmOpen(true)
    }
    // Reset the input so the same file can be selected again
    e.target.value = ''
  }, [])

  // Confirm restore
  const handleConfirmRestore = useCallback(() => {
    if (pendingFile) {
      restoreMutation.mutate(pendingFile)
    }
  }, [pendingFile, restoreMutation])

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <Database className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="size-3.5 mr-2" />
                Stáhnout zálohu
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-3.5 mr-2" />
                Obnovit ze zálohy
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Záloha dat</TooltipContent>
      </Tooltip>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obnovit data ze zálohy?</AlertDialogTitle>
            <AlertDialogDescription>
              Tímto se nahradí všechna stávající data. Pokračovat?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore} disabled={restoreMutation.isPending}>
              {restoreMutation.isPending ? 'Obnovuji…' : 'Obnovit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
