'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import {
  Bell,
  FileText,
  Pencil,
  Trash2,
  X,
  Loader2,
  TreePine,
  MapPin,
  CalendarDays,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ReminderEditor } from '@/components/editors/ReminderEditor'
import type { Reminder } from '@/lib/types'

const bulkNoteSchema = z.object({
  note: z.string().min(1, 'Zadejte text poznámky'),
})

type BulkNoteValues = z.infer<typeof bulkNoteSchema>

const bulkEditSchema = z.object({
  speciesLatin: z.string().optional(),
  locality: z.string().optional(),
  plantedAt: z.string().optional(),
})

type BulkEditValues = z.infer<typeof bulkEditSchema>

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
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editCalendarOpen, setEditCalendarOpen] = useState(false)

  const noteForm = useForm<BulkNoteValues>({
    resolver: zodResolver(bulkNoteSchema),
    defaultValues: { note: '' },
  })

  const editForm = useForm<BulkEditValues>({
    resolver: zodResolver(bulkEditSchema),
    defaultValues: { speciesLatin: '', locality: '', plantedAt: '' },
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
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      setNoteDialogOpen(false)
      noteForm.reset()
      onClearSelection()
    },
  })

  const bulkEditMutation = useMutation({
    mutationFn: async (data: BulkEditValues) => {
      const payload: { recordNumbers: number[]; speciesLatin?: string; locality?: string | null; plantedAt?: string } = {
        recordNumbers: selectedRecordNumbers,
      }
      if (data.speciesLatin && data.speciesLatin.trim()) {
        payload.speciesLatin = data.speciesLatin.trim()
      }
      if (data.locality !== undefined && data.locality.trim() !== '') {
        payload.locality = data.locality.trim()
      } else if (data.locality === '') {
        // Don't send locality if empty — means "don't change"
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      setEditDialogOpen(false)
      editForm.reset()
      onClearSelection()
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        selectedRecordNumbers.map(n =>
          fetch(`/api/records/${n}`, { method: 'DELETE' })
        )
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      onClearSelection()
    },
  })

  const onSubmitNote = (data: BulkNoteValues) => {
    bulkNoteMutation.mutate(data)
  }

  const onSubmitEdit = (data: BulkEditValues) => {
    bulkEditMutation.mutate(data)
  }

  if (selectedRecordNumbers.length === 0) return null

  // Watch the plantedAt field for the calendar display
  const editPlantedAt = editForm.watch('plantedAt')

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
          onClick={() => setEditDialogOpen(true)}
        >
          <Pencil className="size-3.5" />
          Upravit
        </Button>

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

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Smazat ({selectedRecordNumbers.length})
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Smazat vybrané záznamy?</AlertDialogTitle>
              <AlertDialogDescription>
                Tato akce je nevratná. {selectedRecordNumbers.length} {selectedRecordNumbers.length === 1 ? 'záznam' : selectedRecordNumbers.length < 5 ? 'záznamy' : 'záznamů'} a všechny jejich připomínky budou trvale smazány.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => bulkDeleteMutation.mutate()}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {bulkDeleteMutation.isPending ? 'Mazání…' : 'Smazat'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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

      {/* Bulk edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hromadná úprava</DialogTitle>
            <DialogDescription>
              Upravit {selectedRecordNumbers.length} vybraných záznamů
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Ponechte pole prázdná, pokud je nechcete měnit.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="edit-species" className="text-xs flex items-center gap-1.5">
                <TreePine className="size-3 text-green-600" />
                Druh
              </Label>
              <Input
                id="edit-species"
                className="text-sm"
                placeholder="Např. Quercus robur"
                {...editForm.register('speciesLatin')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-locality" className="text-xs flex items-center gap-1.5">
                <MapPin className="size-3 text-muted-foreground" />
                Lokalita
              </Label>
              <Input
                id="edit-locality"
                className="text-sm"
                placeholder="Např. Praha, Stromovka"
                {...editForm.register('locality')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <CalendarDays className="size-3 text-green-600" />
                Datum výsadby
              </Label>
              <Popover open={editCalendarOpen} onOpenChange={setEditCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-1.5 text-sm font-normal h-9"
                  >
                    <CalendarDays className="size-3.5 text-green-600" />
                    {editPlantedAt
                      ? format(parseISO(editPlantedAt), 'd.M.yyyy')
                      : 'Vyberte datum…'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editPlantedAt ? parseISO(editPlantedAt) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        editForm.setValue('plantedAt', format(date, 'yyyy-MM-dd'))
                        setEditCalendarOpen(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {editPlantedAt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => editForm.setValue('plantedAt', '')}
                >
                  Vymazat datum
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(false)}
              >
                Zrušit
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={bulkEditMutation.isPending}
                className="gap-1"
              >
                {bulkEditMutation.isPending && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Uložit změny
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
