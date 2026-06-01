'use client'

import { useState } from 'react'
import { format, subDays, subMonths, startOfMonth, startOfYear, endOfMonth, endOfYear, parseISO, isValid } from 'date-fns'
import { cs } from 'date-fns/locale'
import { CalendarDays, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface DateRangePreset {
  label: string
  getDateRange: () => { from: Date; to: Date }
}

const presets: DateRangePreset[] = [
  {
    label: 'Tento měsíc',
    getDateRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    label: 'Tento rok',
    getDateRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }),
  },
  {
    label: 'Posledních 30 dní',
    getDateRange: () => ({ from: subDays(new Date(), 30), to: new Date() }),
  },
  {
    label: 'Posledních 90 dní',
    getDateRange: () => ({ from: subDays(new Date(), 90), to: new Date() }),
  },
  {
    label: 'Minulý rok',
    getDateRange: () => {
      const lastYear = new Date().getFullYear() - 1
      return { from: new Date(lastYear, 0, 1), to: new Date(lastYear, 11, 31) }
    },
  },
]

interface DateRangePickerProps {
  dateFrom: string | null
  dateTo: string | null
  onDateFromChange: (d: string | null) => void
  onDateToChange: (d: string | null) => void
  onClear: () => void
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClear,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  const fromDate = dateFrom && isValid(parseISO(dateFrom)) ? parseISO(dateFrom) : undefined
  const toDate = dateTo && isValid(parseISO(dateTo)) ? parseISO(dateTo) : undefined

  const hasRange = dateFrom || dateTo

  const handlePresetClick = (preset: DateRangePreset) => {
    const { from, to } = preset.getDateRange()
    onDateFromChange(format(from, 'yyyy-MM-dd'))
    onDateToChange(format(to, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const handleFromSelect = (date: Date | undefined) => {
    if (date) {
      onDateFromChange(format(date, 'yyyy-MM-dd'))
    } else {
      onDateFromChange(null)
    }
  }

  const handleToSelect = (date: Date | undefined) => {
    if (date) {
      onDateToChange(format(date, 'yyyy-MM-dd'))
    } else {
      onDateToChange(null)
    }
  }

  const formatDisplayDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const d = parseISO(dateStr)
    if (!isValid(d)) return dateStr
    return format(d, 'd.M.yyyy', { locale: cs })
  }

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 gap-1.5 text-xs',
              hasRange && 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400'
            )}
          >
            <CalendarDays className="size-3.5" />
            <span className="hidden sm:inline">Období</span>
            {hasRange && (
              <span className="text-[10px] font-medium">
                {formatDisplayDate(dateFrom)} – {formatDisplayDate(dateTo)}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0" sideOffset={4}>
          <div className="flex">
            {/* Presets */}
            <div className="border-r p-2 space-y-0.5 w-40">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider px-2 py-1">
                Rychlé volby
              </p>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-7"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
              <Separator className="my-1" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-7 text-muted-foreground"
                onClick={() => {
                  onClear()
                  setOpen(false)
                }}
              >
                Vše (zrušit)
              </Button>
            </div>

            {/* Calendars */}
            <div className="p-2 space-y-2">
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider px-2 mb-1">
                  Od
                </p>
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={handleFromSelect}
                  numberOfMonths={1}
                />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider px-2 mb-1">
                  Do
                </p>
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={handleToSelect}
                  numberOfMonths={1}
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {hasRange && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onClear}
          title="Zrušit filtr období"
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  )
}
