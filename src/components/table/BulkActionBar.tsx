'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Bell,
  FileText,
  X,
  Loader2,
} from 'lucide-react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ReminderEditor } from '@/components/editors/ReminderEditor'
import type { Reminder } from '@/lib/types'

const bulkNoteSchema = z.object({
  note: z.string().min(1, 'Zadejte text poznámky'),
})

type BulkNoteValues = z.infer<typeof bulkNoteSchema>

interface BulkActionBarProps {
  selectedRecordNumbers: number[]
  onClearSelection: () => void
  existingReminders?: Reminder[]
}

export function BulkActionBar({
  selectedRecordNumbers,
  onClearSelection,
  existingReminders = [],
}: BulkActionBarProps) {
  const queryClient = useQueryClient()
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)

  const noteForm = useForm<BulkNoteValues>({
    resolver: zodResolver(bulkNoteSchema),
    defaultValues: { note: '' },
  })

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      setNoteDialogOpen(false)
      noteForm.reset()
      onClearSelection()
    },
  })

  const onSubmitNote = (data: BulkNoteValues) => {
    bulkNoteMutation.mutate(data)
  }

  if (selectedRecordNumbers.length === 0) return null

  return (
    <>
      <div className="sticky bottom-0 left-0 right-0 z-10 flex items-center gap-3 rounded-lg border bg-background/95 backdrop-blur-sm px-4 py-2 shadow-lg">
        <span className="text-sm font-medium">
          Vybráno: {selectedRecordNumbers.length}
        </span>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setNoteDialogOpen(true)}
        >
          <FileText className="size-3.5" />
          Přidat poznámku
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setReminderDialogOpen(true)}
        >
          <Bell className="size-3.5" />
          Nastavit připomínku
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={onClearSelection}
        >
          <X className="size-3.5" />
          Zrušit výběr
        </Button>
      </div>

      {/* Bulk note dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Přidat poznámku</DialogTitle>
            <DialogDescription>
              Přidat poznámku k {selectedRecordNumbers.length} vybraným záznamům
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={noteForm.handleSubmit(onSubmitNote)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-note" className="text-xs">Poznámka</Label>
              <Textarea
                id="bulk-note"
                className="text-sm min-h-[80px]"
                placeholder="Zadejte text poznámky…"
                {...noteForm.register('note')}
              />
              {noteForm.formState.errors.note && (
                <p className="text-xs text-destructive">
                  {noteForm.formState.errors.note.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNoteDialogOpen(false)}
              >
                Zrušit
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={bulkNoteMutation.isPending}
                className="gap-1"
              >
                {bulkNoteMutation.isPending && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Uložit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk reminder dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nastavit připomínku</DialogTitle>
            <DialogDescription>
              Vytvořit připomínku pro {selectedRecordNumbers.length} vybraných záznamů
            </DialogDescription>
          </DialogHeader>
          <ReminderEditor
            recordNumber={selectedRecordNumbers[0]}
            existingReminders={existingReminders}
            recordNumbers={selectedRecordNumbers}
            onAfterSubmit={() => {
              setReminderDialogOpen(false)
              onClearSelection()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
