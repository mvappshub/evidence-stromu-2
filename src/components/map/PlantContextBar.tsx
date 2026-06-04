'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Undo2, Crosshair, CalendarDays, GitBranch } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePlantStore, LINE_SPACING_PRESETS_M } from '@/store/usePlantStore'
import { useSpeciesCatalog } from '@/hooks/useSpeciesCatalog'
import { useMapRecordMutations } from '@/hooks/useMapRecordMutations'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { formatDistance } from '@/lib/haversine'
import { polylineLengthMeters } from '@/lib/geodesic-line-points'
import { finishLinePlaceDrawing } from '@/lib/line-place-actions'

export function PlantContextBar() {
  const activeSpecies = usePlantStore((s) => s.activeSpecies)
  const activeDate = usePlantStore((s) => s.activeDate)
  const activeLocality = usePlantStore((s) => s.activeLocality)
  const placeMode = usePlantStore((s) => s.placeMode)
  const linePlaceMode = usePlantStore((s) => s.linePlaceMode)
  const linePlacePhase = usePlantStore((s) => s.linePlacePhase)
  const lineSpacingMeters = usePlantStore((s) => s.lineSpacingMeters)
  const linePlaceVertices = usePlantStore((s) => s.linePlaceVertices)
  const linePlacePreview = usePlantStore((s) => s.linePlacePreview)
  const recentSpecies = usePlantStore((s) => s.recentSpecies)
  const lastInsertedRecordNumber = usePlantStore((s) => s.lastInsertedRecordNumber)
  const setActiveSpecies = usePlantStore((s) => s.setActiveSpecies)
  const setActiveDate = usePlantStore((s) => s.setActiveDate)
  const setActiveLocality = usePlantStore((s) => s.setActiveLocality)
  const togglePlaceMode = usePlantStore((s) => s.togglePlaceMode)
  const toggleLinePlaceMode = usePlantStore((s) => s.toggleLinePlaceMode)
  const setLineSpacingMeters = usePlantStore((s) => s.setLineSpacingMeters)
  const clearLinePlacePreview = usePlantStore((s) => s.clearLinePlacePreview)
  const resetLinePlace = usePlantStore((s) => s.resetLinePlace)
  const setLinePlaceMode = usePlantStore((s) => s.setLinePlaceMode)
  const setLastInsertedRecordNumber = usePlantStore((s) => s.setLastInsertedRecordNumber)

  const { createLineBulkMutation } = useMapRecordMutations()

  const [calendarOpen, setCalendarOpen] = useState(false)
  const [speciesFocused, setSpeciesFocused] = useState(false)
  const [customSpacing, setCustomSpacing] = useState('')
  const { data: catalog = [] } = useSpeciesCatalog(true)
  const catalogNames = catalog.map((s) => s.latinName)
  const pickerSpecies = catalogNames.length > 0 ? catalogNames : recentSpecies

  const lineLengthM =
    linePlaceVertices.length >= 2 ? polylineLengthMeters(linePlaceVertices) : 0
  const previewCount = linePlacePreview?.length ?? 0

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

  const handleSpacingSelect = (value: string) => {
    if (value === 'custom') return
    setLineSpacingMeters(Number(value))
    setCustomSpacing('')
  }

  const handleCustomSpacingBlur = () => {
    const n = parseFloat(customSpacing.replace(',', '.'))
    if (Number.isFinite(n) && n > 0) {
      setLineSpacingMeters(n)
    }
  }

  const handleConfirmLinePlace = () => {
    if (!linePlacePreview?.length) return
    createLineBulkMutation.mutate(linePlacePreview)
  }

  const spacingSelectValue = LINE_SPACING_PRESETS_M.includes(
    lineSpacingMeters as (typeof LINE_SPACING_PRESETS_M)[number]
  )
    ? String(lineSpacingMeters)
    : 'custom'

  const barActive = placeMode || linePlaceMode

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 z-10 devtools-drawer px-2 py-1.5',
        barActive && 'outline outline-1 outline-[#166534] outline-offset-[-1px]'
      )}
    >
      <div className="flex items-center gap-1.5 flex-wrap w-full">
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
          {speciesFocused && pickerSpecies.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-px bg-popover border border-border z-50 max-h-32 overflow-y-auto">
              {pickerSpecies
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

        <Select value={spacingSelectValue} onValueChange={handleSpacingSelect}>
          <SelectTrigger
            className={cn(
              'devtools-input !h-[22px] !min-h-[22px] !py-0 w-[72px] shrink-0',
              'shadow-none focus-visible:ring-1 gap-1 leading-none [&_svg]:size-3'
            )}
          >
            <SelectValue placeholder="rozestup" />
          </SelectTrigger>
          <SelectContent>
            {LINE_SPACING_PRESETS_M.map((m) => (
              <SelectItem key={m} value={String(m)} className="text-[11px]">
                {m} m
              </SelectItem>
            ))}
            <SelectItem value="custom" className="text-[11px]">
              vlastní
            </SelectItem>
          </SelectContent>
        </Select>
        {spacingSelectValue === 'custom' && (
          <input
            value={customSpacing}
            onChange={(e) => setCustomSpacing(e.target.value)}
            onBlur={handleCustomSpacingBlur}
            placeholder="m"
            className="devtools-input w-12 shrink-0"
          />
        )}

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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={linePlaceMode ? 'default' : 'outline'}
              className="h-[22px]"
              onClick={toggleLinePlaceMode}
            >
              <GitBranch className="size-3" />
              řada
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px] font-mono max-w-[200px]">
            Nakreslete čáru na mapě, potom Hotovo a Vložit
          </TooltipContent>
        </Tooltip>

        {linePlaceMode && linePlacePhase === 'drawing' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-[22px] text-[10px]"
              onClick={() => finishLinePlaceDrawing()}
              disabled={linePlaceVertices.length < 2}
            >
              Hotovo
            </Button>
            {linePlaceVertices.length > 0 && (
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                {linePlaceVertices.length} bodů
                {lineLengthM > 0 ? ` · ${formatDistance(lineLengthM)}` : ''}
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-[22px] text-[10px]"
              onClick={() => resetLinePlace()}
            >
              Zrušit
            </Button>
          </>
        )}

        {linePlaceMode && linePlacePhase === 'preview' && previewCount > 0 && (
          <>
            <span className="text-[10px] font-mono text-muted-foreground">
              Náhled: <strong className="text-foreground">{previewCount}</strong> stromů
            </span>
            <Button
              size="sm"
              className="h-[22px] text-[10px]"
              onClick={handleConfirmLinePlace}
              disabled={createLineBulkMutation.isPending}
            >
              Vložit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-[22px] text-[10px]"
              onClick={clearLinePlacePreview}
            >
              Upravit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-[22px] text-[10px]"
              onClick={() => {
                resetLinePlace()
                setLinePlaceMode(false)
              }}
            >
              Zrušit
            </Button>
          </>
        )}

        {lastInsertedRecordNumber != null && !linePlaceMode && (
          <Button variant="ghost" size="sm" className="h-[22px]" onClick={handleUndo}>
            <Undo2 className="size-3" />
            zpět
          </Button>
        )}

        {pickerSpecies.length > 0 && (
          <div className="hidden lg:flex items-center gap-0.5 ml-1 border-l border-border pl-1.5">
            {pickerSpecies
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
