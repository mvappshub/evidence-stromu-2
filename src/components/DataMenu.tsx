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
import { recordFiltersToQueryString } from '@/lib/record-filters-client'
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

  const uiFilters = {
    searchQuery,
    filterSpecies,
    filterLocality,
    dateFrom,
    dateTo,
    hasNoteFilter,
    noReminderFilter,
  }

  const handlePrint = () => {
    openPrintReport(uiFilters)
  }

  const handleExport = (format: 'csv' | 'geojson') => {
    const query = recordFiltersToQueryString(uiFilters, { format })
    window.open(`/api/records/export?${query}`, '_blank')
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
