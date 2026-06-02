'use client'

import { useCallback } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { openPrintReport } from '@/lib/print-report'
import type { UiRecordFilters } from '@/lib/record-filters-client'

type PrintViewProps = UiRecordFilters

export function PrintView({
  searchQuery,
  filterSpecies,
  filterLocality,
  dateFrom,
  dateTo,
  hasNoteFilter,
  noReminderFilter,
}: PrintViewProps) {
  const handlePrint = useCallback(() => {
    openPrintReport({
      searchQuery,
      filterSpecies,
      filterLocality,
      dateFrom,
      dateTo,
      hasNoteFilter,
      noReminderFilter,
    })
  }, [
    searchQuery,
    filterSpecies,
    filterLocality,
    dateFrom,
    dateTo,
    hasNoteFilter,
    noReminderFilter,
  ])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handlePrint}
        >
          <Printer className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">Tisk</TooltipContent>
    </Tooltip>
  )
}
