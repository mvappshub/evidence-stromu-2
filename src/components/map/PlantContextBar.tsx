'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { TreePine, Undo2, Crosshair, MapPin, CalendarDays } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePlantStore } from '@/store/usePlantStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

export function PlantContextBar() {
  const activeSpecies = usePlantStore((s) => s.activeSpecies)
  const activeDate = usePlantStore((s) => s.activeDate)
  const activeLocality = usePlantStore((s) => s.activeLocality)
  const placeMode = usePlantStore((s) => s.placeMode)
  const recentSpecies = usePlantStore((s) => s.recentSpecies)
  const lastInsertedRecordNumber = usePlantStore((s) => s.lastInsertedRecordNumber)
  const setActiveSpecies = usePlantStore((s) => s.setActiveSpecies)
  const setActiveDate = usePlantStore((s) => s.setActiveDate)
  const setActiveLocality = usePlantStore((s) => s.setActiveLocality)
  const togglePlaceMode = usePlantStore((s) => s.togglePlaceMode)
  const setLastInsertedRecordNumber = usePlantStore((s) => s.setLastInsertedRecordNumber)

  const [calendarOpen, setCalendarOpen] = useState(false)
  const [speciesFocused, setSpeciesFocused] = useState(false)

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setActiveDate(format(date, 'yyyy-MM-dd'))
      setCalendarOpen(false)
    }
  }

  const handleUndo = async () => {
    if (lastInsertedRecordNumber == null) return
    try {
      await fetch(`/api/records/${lastInsertedRecordNumber}`, { method: 'DELETE' })
      setLastInsertedRecordNumber(null)
    } catch {
      // silent fail — user can retry
    }
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10 max-w-3xl mx-auto">
      <div
        className={cn(
          'rounded-2xl border px-4 py-3',
          'bg-gradient-to-r from-green-50/95 via-background/95 to-green-50/80 backdrop-blur-xl',
          'dark:from-green-950/30 dark:via-background/95 dark:to-green-950/20',
          'border-green-200/60 dark:border-green-900/40',
          'flex flex-col gap-2',
          'transition-all duration-300',
          placeMode
            ? 'shadow-2xl shadow-green-600/20 border-green-400/70 dark:border-green-700/50'
            : 'shadow-xl hover:shadow-2xl'
        )}
      >
        {/* Main controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Species input */}
          <div className="relative flex-1 min-w-[140px]">
            <TreePine className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-green-600 pointer-events-none" />
            <Input
              value={activeSpecies}
              onChange={(e) => setActiveSpecies(e.target.value)}
              onFocus={() => setSpeciesFocused(true)}
              onBlur={() => setTimeout(() => setSpeciesFocused(false), 200)}
              placeholder="Druh (latinsky)"
              className="h-9 pl-7 text-xs border-green-200 dark:border-green-900/50 focus-visible:ring-green-500/50 focus-visible:border-green-500 transition-all duration-200"
            />
            {speciesFocused && recentSpecies.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                <p className="text-[10px] text-muted-foreground px-2 py-1 border-b font-medium">Naposledy použité</p>
                {recentSpecies
                  .filter(s => s.toLowerCase() !== activeSpecies.toLowerCase())
                  .map((species) => (
                    <button
                      key={species}
                      className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent transition-colors italic"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setActiveSpecies(species)
                        setSpeciesFocused(false)
                      }}
                    >
                      {species}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Date picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs font-normal min-w-[120px]"
              >
                <CalendarDays className="size-3.5 text-green-600" />
                {activeDate
                  ? format(parseISO(activeDate), 'd.M.yyyy')
                  : 'Datum výsadby'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={activeDate ? parseISO(activeDate) : undefined}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Locality input — hidden on very small screens */}
          <div className="relative flex-1 min-w-[100px] hidden sm:block">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-green-600/70 pointer-events-none" />
            <Input
              value={activeLocality}
              onChange={(e) => setActiveLocality(e.target.value)}
              placeholder="Lokalita"
              className="h-9 pl-7 text-xs border-green-200 dark:border-green-900/50 focus-visible:ring-green-500/50 focus-visible:border-green-500 transition-all duration-200"
            />
          </div>

          {/* Place mode toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                className={cn(
                  'h-9 gap-1.5 text-xs font-medium transition-all duration-200',
                  placeMode
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30 place-mode-active-anim'
                    : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50 dark:hover:bg-green-900/40'
                )}
                onClick={togglePlaceMode}
              >
                <Crosshair className="size-3.5" />
                {placeMode ? 'Vkládání' : 'Vkládat'}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Režim vkládání <kbd className="ml-1 px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">P</kbd>
            </TooltipContent>
          </Tooltip>

          {/* Undo button */}
          {lastInsertedRecordNumber != null && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs"
              onClick={handleUndo}
            >
              <Undo2 className="size-3.5" />
              Zpět
            </Button>
          )}
        </div>

        {/* Recent species chips */}
        {recentSpecies.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {recentSpecies.filter(s => s !== activeSpecies).slice(0, 5).map((species) => (
              <button
                key={species}
                className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-900/40 transition-all duration-150 italic cursor-pointer border border-green-100 dark:border-green-900/30 chip-hover"
                onClick={() => setActiveSpecies(species)}
              >
                {species}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
