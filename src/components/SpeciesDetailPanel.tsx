'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Flower2, TreePine, MapPin, Calendar, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { czechPlural } from '@/lib/czech-plural'
import { useUiStore } from '@/store/useUiStore'

interface SpeciesStats {
  species: string
  count: number
  dateRange: { earliest: string; latest: string } | null
  localities: { name: string; count: number }[]
  recordNumbers: number[]
}

interface StatsSpeciesItem {
  species: string
  count: number
}

interface Stats {
  totalCount: number
  speciesBreakdown: StatsSpeciesItem[]
}

function getFrequencyBadge(count: number, total: number) {
  const pct = total > 0 ? (count / total) * 100 : 0
  if (pct >= 10) return { label: 'Běžný', color: 'bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary' }
  if (pct >= 3) return { label: 'Mírný', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' }
  return { label: 'Vzácný', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' }
}

interface SpeciesDetailPanelProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SpeciesDetailPanel({ open, onOpenChange }: SpeciesDetailPanelProps) {
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null)
  const filterSpecies = useUiStore((s) => s.filterSpecies)
  const setFilterSpecies = useUiStore((s) => s.setFilterSpecies)

  // Fetch stats for species breakdown
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['records-stats'],
    queryFn: async () => {
      const res = await fetch('/api/records/stats')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    staleTime: 30_000,
  })

  // Fetch species-specific details when one is selected
  const { data: speciesDetail, isLoading: detailLoading } = useQuery<SpeciesStats>({
    queryKey: ['species-detail', selectedSpecies],
    queryFn: async () => {
      const res = await fetch(`/api/records/species/${encodeURIComponent(selectedSpecies!)}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: !!selectedSpecies,
    staleTime: 30_000,
  })

  const handleSpeciesClick = (species: string) => {
    if (filterSpecies === species) {
      setSelectedSpecies(null)
      setFilterSpecies('')
    } else {
      setSelectedSpecies(species)
      setFilterSpecies(species)
    }
  }

  const handleClearFilter = () => {
    setSelectedSpecies(null)
    setFilterSpecies('')
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger className="sr-only" tabIndex={-1} aria-hidden />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flower2 className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Druhy stromů</h3>
            </div>
            {filterSpecies && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={handleClearFilter}
              >
                <X className="size-3 mr-1" />
                Zrušit filtr
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-[420px]">
          {statsLoading ? (
            <div className="p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Načítání…
            </div>
          ) : stats ? (
            <div className="p-3 space-y-1">
              {stats.speciesBreakdown.map((s) => {
                const badge = getFrequencyBadge(s.count, stats.totalCount)
                const isSelected = filterSpecies === s.species
                return (
                  <button
                    key={s.species}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 group',
                      isSelected
                        ? 'bg-accent ring-1 ring-border'
                        : 'hover:bg-muted/60'
                    )}
                    onClick={() => handleSpeciesClick(s.species)}
                  >
                    <span
                      className={cn(
                        'size-2 rounded-full shrink-0',
                        badge.label === 'Běžný' ? 'bg-primary' :
                        badge.color.includes('yellow') ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                    />
                    <span className="text-sm italic flex-1 truncate">{s.species}</span>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {s.count}×
                    </span>
                    <Badge variant="secondary" className={cn('text-[9px] px-1.5 py-0 h-4', badge.color)}>
                      {badge.label}
                    </Badge>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground">Chyba při načítání</div>
          )}

          {/* Species detail section */}
          {selectedSpecies && speciesDetail && (
            <>
              <Separator />
              <div className="p-3 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <TreePine className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold italic">{speciesDetail.species}</span>
                </div>

                {/* Count */}
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-muted flex items-center justify-center">
                    <TreePine className="size-3 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="text-sm font-bold tabular-nums">{speciesDetail.count}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {czechPlural(speciesDetail.count, ['kus', 'kusy', 'kusů'])}
                    </span>
                  </div>
                </div>

                {/* Date range */}
                {speciesDetail.dateRange && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="size-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">
                      {format(parseISO(speciesDetail.dateRange.earliest), 'd.M.yyyy', { locale: cs })} – {format(parseISO(speciesDetail.dateRange.latest), 'd.M.yyyy', { locale: cs })}
                    </span>
                  </div>
                )}

                {/* Localities */}
                {speciesDetail.localities.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3 text-muted-foreground" />
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Lokality</p>
                    </div>
                    {speciesDetail.localities.slice(0, 5).map((loc) => (
                      <div key={loc.name} className="flex items-center justify-between text-xs pl-5">
                        <span className="truncate max-w-[160px]">{loc.name}</span>
                        <span className="font-medium tabular-nums text-muted-foreground">{loc.count}×</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {selectedSpecies && detailLoading && (
            <>
              <Separator />
              <div className="p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Načítání detailů…
              </div>
            </>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
