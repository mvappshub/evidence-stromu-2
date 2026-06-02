'use client'

import { useRef, useCallback, useState } from 'react'
import { ChevronDown, Upload, Printer, FileSpreadsheet, FileJson } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUiStore } from '@/store/useUiStore'
import { openPrintReport } from '@/lib/print-report'
import { BackupRestoreMenuItems } from '@/components/BackupRestore'

interface DataMenuProps {
  onImport: () => void
}

export function DataMenu({ onImport }: DataMenuProps) {
  const searchQuery = useUiStore((s) => s.searchQuery)
  const filterSpecies = useUiStore((s) => s.filterSpecies)
  const filterLocality = useUiStore((s) => s.filterLocality)
  const dateFrom = useUiStore((s) => s.dateFrom)
  const dateTo = useUiStore((s) => s.dateTo)
  const hasNoteFilter = useUiStore((s) => s.hasNoteFilter)
  const noReminderFilter = useUiStore((s) => s.noReminderFilter)

  const buildExportParams = useCallback(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (filterSpecies) params.set('species', filterSpecies)
    if (filterLocality) params.set('locality', filterLocality)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (hasNoteFilter) params.set('hasNote', 'true')
    if (noReminderFilter) params.set('noReminder', 'true')
    return params
  }, [
    searchQuery,
    filterSpecies,
    filterLocality,
    dateFrom,
    dateTo,
    hasNoteFilter,
    noReminderFilter,
  ])

  const handlePrint = () => {
    openPrintReport({
      searchQuery,
      filterSpecies,
      filterLocality,
      dateFrom,
      dateTo,
      hasNoteFilter,
      noReminderFilter,
    })
  }

  const handleExport = (format: 'csv' | 'geojson') => {
    const params = buildExportParams()
    params.set('format', format)
    window.open(`/api/records/export?${params.toString()}`, '_blank')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-[22px] gap-0.5 font-mono">
          data
          <ChevronDown className="size-2.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onImport}>
          <Upload className="size-3.5 mr-2" />
          Import CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="size-3.5 mr-2" />
          Tisk
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="size-3.5 mr-2" />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('geojson')}>
          <FileJson className="size-3.5 mr-2" />
          Export GeoJSON
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <BackupRestoreMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
