'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Undo2, Crosshair, CalendarDays } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePlantStore } from '@/store/usePlantStore'
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
      // silent
    }
  }

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 z-10 devtools-drawer px-2 py-1.5',
        placeMode && 'outline outline-1 outline-[#007acc] outline-offset-[-1px]',
      )}
    >
      <div className="flex items-center gap-1.5 flex-wrap max-w-5xl mx-auto">
        <label className="sr-only">Druh</label>
        <div className="relative flex-1 min-w-[120px] max-w-[200px]">
          <input
            value={activeSpecies}
            onChange={(e) => setActiveSpecies(e.target.value)}
            onFocus={() => setSpeciesFocused(true)}
            onBlur={() => setTimeout(() => setSpeciesFocused(false), 200)}
            placeholder="druh"
            className="devtools-input w-full font-mono italic"
          />
          {speciesFocused && recentSpecies.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-px bg-popover border border-border z-50 max-h-32 overflow-y-auto">
              {recentSpecies
                .filter((s) => s.toLowerCase() !== activeSpecies.toLowerCase())
                .map((species) => (
                  <button
                    key={species}
                    type="button"
                    className="w-full text-left px-2 py-1 text-[11px] font-mono italic hover:bg-accent"
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

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-[22px] gap-1 font-mono font-normal">
              <CalendarDays className="size-3 opacity-60" />
              {activeDate ? format(parseISO(activeDate), 'd.M.yyyy') : 'datum'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-sm" align="start">
            <Calendar
              mode="single"
              selected={activeDate ? parseISO(activeDate) : undefined}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <input
          value={activeLocality}
          onChange={(e) => setActiveLocality(e.target.value)}
          placeholder="lokalita"
          className="devtools-input hidden sm:block w-[100px] font-mono"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={placeMode ? 'default' : 'outline'}
              className="h-[22px]"
              onClick={togglePlaceMode}
            >
              <Crosshair className="size-3" />
              {placeMode ? 'vkládání' : 'vkládat'}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px] font-mono">
            P <kbd className="ml-1 px-1 border border-border bg-muted">P</kbd>
          </TooltipContent>
        </Tooltip>

        {lastInsertedRecordNumber != null && (
          <Button variant="ghost" size="sm" className="h-[22px]" onClick={handleUndo}>
            <Undo2 className="size-3" />
            zpět
          </Button>
        )}

        {recentSpecies.length > 0 && (
          <div className="hidden lg:flex items-center gap-0.5 ml-1 border-l border-border pl-1.5">
            {recentSpecies
              .filter((s) => s !== activeSpecies)
              .slice(0, 4)
              .map((species) => (
                <button
                  key={species}
                  type="button"
                  className="text-[10px] px-1 py-0 font-mono italic text-muted-foreground hover:text-foreground hover:bg-accent"
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
