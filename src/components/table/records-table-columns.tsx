'use client'

import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { ArrowUpDown, Loader2, Save, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
import { CoordCell } from '@/components/table/CoordCell'
import { ReminderCell } from '@/components/table/ReminderCell'
import { RecordPhotoButton } from '@/components/table/RecordPhotoButton'
import type { RecordsTableMeta } from '@/components/table/use-record-edit-draft'
import type { TreeRecord } from '@/lib/types'

export type RecordsTableColumnsOptions = {
  speciesFrequencyMap: Record<string, number>
  maxSpeciesFreq: number
}

export function createRecordsTableColumns({
  speciesFrequencyMap,
  maxSpeciesFreq,
}: RecordsTableColumnsOptions): ColumnDef<TreeRecord>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Vybrat vše"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Vybrat záznam ${row.original.recordNumber}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: 'recordNumber',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 gap-1"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Záznam
          <ArrowUpDown className="size-3" />
        </Button>
      ),
      cell: ({ row, table }) => {
        const meta = table.options.meta as RecordsTableMeta | undefined
        const editing = meta?.isEditing(row.original.recordNumber) ?? false
        if (editing && meta?.draft) {
          return (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <span className="font-mono text-[10px] shrink-0">#{row.original.recordNumber}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                type="button"
                title="Uložit"
                disabled={meta.isSaving}
                onClick={() => meta.save()}
              >
                {meta.isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
              </Button>
              <RecordPhotoButton draft={meta.draft} onPhotoPath={(p) => meta.patchField('photoPath', p)} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-6 text-destructive" type="button">
                    <Trash2 className="size-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Smazat #{row.original.recordNumber}?</AlertDialogTitle>
                    <AlertDialogDescription>Nezvratná akce.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Zrušit</AlertDialogCancel>
                    <AlertDialogAction onClick={() => meta.remove()} className="bg-destructive text-white">
                      Smazat
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )
        }
        return <span className="font-mono text-[10px]">#{row.original.recordNumber}</span>
      },
      size: 100,
    },
    {
      accessorKey: 'plantedAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 gap-1"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Datum
          <ArrowUpDown className="size-3" />
        </Button>
      ),
      cell: ({ row, table }) => {
        const meta = table.options.meta as RecordsTableMeta | undefined
        if (meta?.isEditing(row.original.recordNumber) && meta.draft) {
          return (
            <Input
              type="date"
              className="h-7 w-[118px] font-mono text-[11px]"
              value={meta.draft.plantedAt}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => meta.patchField('plantedAt', e.target.value)}
            />
          )
        }
        return (
          <span className="text-[11px] whitespace-nowrap tabular-nums">
            {format(new Date(row.original.plantedAt), 'd.M.yyyy', { locale: cs })}
          </span>
        )
      },
      size: 120,
    },
    {
      accessorKey: 'speciesLatin',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 gap-1"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Druh
          <ArrowUpDown className="size-3" />
        </Button>
      ),
      cell: ({ row, table }) => {
        const meta = table.options.meta as RecordsTableMeta | undefined
        if (meta?.isEditing(row.original.recordNumber) && meta.draft) {
          return (
            <Input
              className="h-7 w-full min-w-[140px] font-mono italic text-[11px]"
              value={meta.draft.speciesLatin}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => meta.patchField('speciesLatin', e.target.value)}
            />
          )
        }
        const freq = speciesFrequencyMap[row.original.speciesLatin] ?? 0
        const intensity = maxSpeciesFreq > 0 ? freq / maxSpeciesFreq : 0
        return (
          <span
            className="text-[11px] italic inline-flex items-center"
            title={`${row.original.speciesLatin} · ${freq} záznamů na stránce`}
          >
            {row.original.speciesLatin}
            <span
              className="species-freq-dot"
              style={{
                backgroundColor: `oklch(${0.4 + intensity * 0.3} ${0.08 + intensity * 0.1} 250 / ${0.3 + intensity * 0.7})`,
              }}
            />
          </span>
        )
      },
    },
    {
      accessorKey: 'locality',
      header: 'Lokalita',
      cell: ({ row, table }) => {
        const meta = table.options.meta as RecordsTableMeta | undefined
        if (meta?.isEditing(row.original.recordNumber) && meta.draft) {
          return (
            <Input
              className="h-7 w-full min-w-[100px] text-[11px]"
              placeholder="lokalita"
              value={meta.draft.locality}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => meta.patchField('locality', e.target.value)}
            />
          )
        }
        const locality = row.original.locality
        if (!locality) return <span className="text-muted-foreground text-[11px]">—</span>
        return <span className="text-[11px] truncate max-w-[140px] inline-block">{locality}</span>
      },
      size: 140,
    },
    {
      id: 'coords',
      header: 'Souřadnice',
      cell: ({ row, table }) => (
        <CoordCell
          recordNumber={row.original.recordNumber}
          lat={row.original.lat}
          lng={row.original.lng}
          tableMeta={table.options.meta as RecordsTableMeta | undefined}
        />
      ),
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: 'note',
      header: 'Poznámka',
      cell: ({ row, table }) => {
        const meta = table.options.meta as RecordsTableMeta | undefined
        if (meta?.isEditing(row.original.recordNumber) && meta.draft) {
          return (
            <Input
              className="h-7 w-full min-w-[160px] text-[11px]"
              placeholder="poznámka"
              value={meta.draft.note}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => meta.patchField('note', e.target.value)}
            />
          )
        }
        const note = row.original.note
        if (!note) return <span className="text-muted-foreground text-[11px]">—</span>
        return <span className="text-[11px] truncate max-w-[200px] inline-block">{note}</span>
      },
      enableSorting: false,
      size: 220,
    },
    {
      id: 'reminders',
      header: 'Připomínky',
      cell: ({ row }) => <ReminderCell record={row.original} />,
      enableSorting: false,
      size: 72,
    },
  ]
}
