'use client'

import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'
import { BarChart3, TreePine, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { czechPlural } from '@/lib/czech-plural'

interface Stats {
  totalCount: number
  speciesBreakdown: { species: string; count: number }[]
  dateRange: { earliest: string | null; latest: string | null }
  localityBreakdown: { locality: string | null; count: number }[]
  yearlyBreakdown: { year: string; count: number }[]
}

export function StatisticsPanel() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['records-stats'],
    queryFn: async () => {
      const res = await fetch('/api/records/stats')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    staleTime: 30_000,
  })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7" title="Statistiky">
          <BarChart3 className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium">Statistiky výsadby</h3>
        </div>
        <ScrollArea className="max-h-[420px]">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Načítání…</div>
          ) : stats ? (
            <div className="p-4 space-y-4">
              {/* Total count */}
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                  <TreePine className="size-4 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{stats.totalCount}</p>
                  <p className="text-[10px] text-muted-foreground">{czechPlural(stats.totalCount, ['strom', 'stromy', 'stromů'])} celkem</p>
                </div>
              </div>

              {/* Date range */}
              {stats.dateRange.earliest && (
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    {format(parseISO(stats.dateRange.earliest), 'd.M.yyyy', { locale: cs })} – {format(parseISO(stats.dateRange.latest!), 'd.M.yyyy', { locale: cs })}
                  </span>
                </div>
              )}

              <Separator />

              {/* Species bar chart */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-1.5">Druhy</p>
                {stats.speciesBreakdown.slice(0, 8).map((s) => {
                  const maxCount = stats.speciesBreakdown[0]?.count ?? 1
                  const pct = (s.count / maxCount) * 100
                  return (
                    <div key={s.species} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="italic truncate max-w-[140px]">{s.species}</span>
                        <span className="font-medium tabular-nums ml-2">{s.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Locality bar chart */}
              {stats.localityBreakdown.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-1.5">Lokality</p>
                    {stats.localityBreakdown.slice(0, 5).map((l) => {
                      const maxCount = stats.localityBreakdown[0]?.count ?? 1
                      const pct = (l.count / maxCount) * 100
                      return (
                        <div key={l.locality} className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs">
                            <MapPin className="size-3 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[130px]">{l.locality}</span>
                            <span className="font-medium tabular-nums ml-auto">{l.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Yearly breakdown timeline */}
              {stats.yearlyBreakdown.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-1.5">Výsadba po letech</p>
                    <div className="flex items-end gap-1 h-16">
                      {stats.yearlyBreakdown.map((y) => {
                        const maxCount = Math.max(...stats.yearlyBreakdown.map(x => x.count))
                        const pct = (y.count / maxCount) * 100
                        return (
                          <div key={y.year} className="flex-1 flex flex-col items-center gap-0.5" title={`${y.year}: ${y.count}`}>
                            <span className="text-[9px] font-medium tabular-nums">{y.count}</span>
                            <div
                              className="w-full rounded-t bg-green-500/70 transition-all duration-500 min-h-[2px]"
                              style={{ height: `${Math.max(pct, 5)}%` }}
                            />
                            <span className="text-[8px] text-muted-foreground">{y.year.slice(2)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground">Chyba při načítání</div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
