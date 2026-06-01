'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { TreePine, Undo2, Crosshair, MapPin } from 'lucide-react'
import { usePlantStore } from '@/store/usePlantStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    <div className="absolute bottom-4 left-4 right-4 z-10">
      <div
        className={cn(
          'rounded-xl border shadow-lg px-3 py-2.5',
          'bg-background/80 backdrop-blur-md',
          'flex flex-col gap-2'
        )}
      >
        {/* Main controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Species input */}
          <div className="relative flex-1 min-w-[140px]">
            <TreePine className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={activeSpecies}
              onChange={(e) => setActiveSpecies(e.target.value)}
              placeholder="Druh (latinsky)"
              className="h-8 pl-7 text-xs"
            />
          </div>

          {/* Date picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-normal min-w-[120px]"
              >
                <MapPin className="size-3.5 text-muted-foreground" />
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

          {/* Locality input */}
          <div className="relative flex-1 min-w-[100px]">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={activeLocality}
              onChange={(e) => setActiveLocality(e.target.value)}
              placeholder="Lokalita"
              className="h-8 pl-7 text-xs"
            />
          </div>

          {/* Place mode toggle */}
          <Button
            size="sm"
            className={cn(
              'h-8 gap-1.5 text-xs transition-all',
              placeMode
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/30 animate-pulse'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
            onClick={togglePlaceMode}
          >
            <Crosshair className="size-3.5" />
            {placeMode ? 'Vkládání' : 'Vkládat'}
          </Button>

          {/* Undo button */}
          {lastInsertedRecordNumber != null && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleUndo}
            >
              <Undo2 className="size-3.5" />
              Zpět
            </Button>
          )}
        </div>

        {/* Recent species chips */}
        {recentSpecies.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {recentSpecies.map((species) => (
              <Badge
                key={species}
                variant={species === activeSpecies ? 'default' : 'outline'}
                className="cursor-pointer text-[10px] px-1.5 py-0 h-5 hover:bg-primary/80 hover:text-primary-foreground transition-colors"
                onClick={() => setActiveSpecies(species)}
              >
                {species}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
