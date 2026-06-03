'use client'

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Upload, ExternalLink, Table2 } from 'lucide-react'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { toast } from 'sonner'

const isDev = process.env.NODE_ENV === 'development'

type BackupContextValue = {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleDownload: () => Promise<void>
  triggerRestorePicker: () => void
  handleOpenPrismaStudio: () => Promise<void>
  studioLoading: boolean
}

const BackupContext = createContext<BackupContextValue | null>(null)

function useBackupContext() {
  const ctx = useContext(BackupContext)
  if (!ctx) throw new Error('BackupRestoreProvider required')
  return ctx
}

export function BackupRestoreProvider({ children }: { children: ReactNode }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [studioLoading, setStudioLoading] = useState(false)
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
    onSuccess: (data) => {
      toast.success('Data obnovena', { description: `${data.restored} záznamů` })
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

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setPendingFile(file)
        setConfirmOpen(true)
      }
      e.target.value = ''
    },
    []
  )

  const handleConfirmRestore = useCallback(() => {
    if (pendingFile) restoreMutation.mutate(pendingFile)
  }, [pendingFile, restoreMutation])

  const handleOpenPrismaStudio = useCallback(async () => {
    setStudioLoading(true)
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
      setStudioLoading(false)
    }
  }, [])

  const value: BackupContextValue = {
    fileInputRef,
    handleDownload,
    triggerRestorePicker: () => fileInputRef.current?.click(),
    handleOpenPrismaStudio,
    studioLoading,
  }

  return (
    <BackupContext.Provider value={value}>
      {children}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obnovit data ze zálohy?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">Nahradí se všechna stávající data.</span>
              <span className="block text-xs text-muted-foreground">
                Nové zálohy už obsahují i fotografie. U starších JSON záloh bez
                vložených fotek se obrázky neobnoví.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? 'Obnovuji…' : 'Obnovit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BackupContext.Provider>
  )
}

export function BackupRestoreMenuItems() {
  const { handleDownload, triggerRestorePicker, handleOpenPrismaStudio, studioLoading } =
    useBackupContext()

  return (
    <>
      <DropdownMenuItem onClick={handleDownload}>
        <Download className="size-3.5 mr-2" />
        Stáhnout zálohu JSON
      </DropdownMenuItem>
      <DropdownMenuItem onClick={triggerRestorePicker}>
        <Upload className="size-3.5 mr-2" />
        Obnovit ze zálohy
      </DropdownMenuItem>
      {isDev && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleOpenPrismaStudio}
            disabled={studioLoading}
          >
            <Table2 className="size-3.5 mr-2" />
            {studioLoading ? 'Spouštím…' : 'Prisma Studio'}
            <ExternalLink className="size-3 ml-auto opacity-50" />
          </DropdownMenuItem>
        </>
      )}
    </>
  )
}
