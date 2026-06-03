'use client'

import { CalendarDays, StickyNote, BellOff, X, Search, Upload, FileSpreadsheet, FileJson } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { DateRangePicker } from '@/components/table/DateRangePicker'
import { recordFiltersToQueryString } from '@/lib/record-filters-client'
import { PrintView } from '@/components/PrintView'

const PRESET_CHIP =
  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border'

type RecordsTableToolbarProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  filterSpecies: string
  onFilterSpeciesChange: (value: string) => void
  filterLocality: string
  onFilterLocalityChange: (value: string) => void
  dateFrom: string | null
  dateTo: string | null
  onDateFromChange: (value: string | null) => void
  onDateToChange: (value: string | null) => void
  onClearDateRange: () => void
  speciesOptions: string[]
  localityOptions: string[]
  isPresetActive: (preset: string) => boolean
  togglePreset: (preset: string) => void
  onImportClick: () => void
  hasNoteFilter: boolean
  noReminderFilter: boolean
}

export function RecordsTableToolbar(props: RecordsTableToolbarProps) {
  const chipClass = (active: boolean) =>
    cn(
      PRESET_CHIP,
      active
        ? 'bg-secondary text-secondary-foreground border-border'
        : 'bg-background text-muted-foreground border-border hover:bg-muted',
    )

  const uiFilters = {
    searchQuery: props.searchQuery,
    filterSpecies: props.filterSpecies,
    filterLocality: props.filterLocality,
    dateFrom: props.dateFrom,
    dateTo: props.dateTo,
    hasNoteFilter: props.hasNoteFilter,
    noReminderFilter: props.noReminderFilter,
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2 pb-1">
        {(
          [
            ['thisMonth', 'Tento měsíc', CalendarDays],
            ['thisYear', 'Tento rok', CalendarDays],
            ['last30', 'Poslední 30 dní', CalendarDays],
            ['noReminder', 'Bez připomínky', BellOff],
            ['hasNote', 'S poznámkou', StickyNote],
          ] as const
        ).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => props.togglePreset(id)} className={chipClass(props.isPresetActive(id))}>
            <Icon className="size-3" />
            {label}
            {props.isPresetActive(id) && <X className="size-2.5 ml-0.5" />}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Hledat druh, lokalitu, poznámku…"
            className="h-8 text-sm pl-8"
            value={props.searchQuery}
            onChange={(e) => props.onSearchChange(e.target.value)}
          />
        </div>

        <Select
          value={props.filterSpecies || '__all__'}
          onValueChange={(val) => props.onFilterSpeciesChange(val === '__all__' ? '' : val)}
        >
          <SelectTrigger className="h-8 text-sm w-full sm:w-[160px]">
            <SelectValue placeholder="Druh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Všechny druhy</SelectItem>
            {props.speciesOptions.map((sp) => (
              <SelectItem key={sp} value={sp}>
                {sp}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={props.filterLocality || '__all__'}
          onValueChange={(val) => props.onFilterLocalityChange(val === '__all__' ? '' : val)}
        >
          <SelectTrigger className="h-8 text-sm w-full sm:w-[160px]">
            <SelectValue placeholder="Lokalita" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Všechny lokality</SelectItem>
            {props.localityOptions.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangePicker
          dateFrom={props.dateFrom}
          dateTo={props.dateTo}
          onDateFromChange={props.onDateFromChange}
          onDateToChange={props.onDateToChange}
          onClear={props.onClearDateRange}
        />

        <div className="flex items-center gap-0.5 ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" onClick={props.onImportClick}>
                <Upload className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Importovat
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => {
                  const query = recordFiltersToQueryString(uiFilters, { format: 'csv' })
                  window.open(`/api/records/export?${query}`, '_blank')
                }}
              >
                <FileSpreadsheet className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Exportovat CSV
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => {
                  const query = recordFiltersToQueryString(uiFilters, {
                    format: 'geojson',
                  })
                  window.open(`/api/records/export?${query}`, '_blank')
                }}
              >
                <FileJson className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Exportovat GeoJSON
            </TooltipContent>
          </Tooltip>
          <PrintView
            searchQuery={props.searchQuery}
            filterSpecies={props.filterSpecies}
            filterLocality={props.filterLocality}
            dateFrom={props.dateFrom}
            dateTo={props.dateTo}
            hasNoteFilter={props.hasNoteFilter}
            noReminderFilter={props.noReminderFilter}
          />
        </div>
      </div>
    </>
  )
}
