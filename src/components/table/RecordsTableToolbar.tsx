'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRangePicker } from '@/components/table/DateRangePicker'

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
}

export function RecordsTableToolbar(props: RecordsTableToolbarProps) {
  return (
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
    </div>
  )
}
