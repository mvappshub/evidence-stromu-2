'use client'

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
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
import { useBackupRestore } from '@/hooks/useBackupRestore'

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
  const { handleDownload, restoreMutation, handleOpenPrismaStudio } = useBackupRestore(
    () => {
      setConfirmOpen(false)
      setPendingFile(null)
    },
    setStudioLoading,
  )

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
