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
      <PopoverContent align="end" className="w-96 p-0">
        <div className="p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-green-600" />
            <h3 className="text-sm font-semibold">Statistiky výsadby</h3>
          </div>
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
                <div className="flex items-center gap-1.5">
                  <TreePine className="size-3 text-green-600" />
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Druhy</p>
                </div>
                {stats.speciesBreakdown.slice(0, 8).map((s, idx) => {
                  const maxCount = stats.speciesBreakdown[0]?.count ?? 1
                  const pct = (s.count / maxCount) * 100
                  const totalPct = stats.totalCount > 0 ? Math.round((s.count / stats.totalCount) * 100) : 0
                  return (
                    <div key={s.species} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="italic truncate max-w-[160px]">{s.species}</span>
                        <span className="font-medium tabular-nums ml-2 flex items-center gap-1">
                          {s.count}
                          <span className="text-[9px] text-muted-foreground">({totalPct}%)</span>
                        </span>
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
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3 text-emerald-500" />
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Lokality</p>
                    </div>
                    {stats.localityBreakdown.slice(0, 5).map((l) => {
                      const maxCount = stats.localityBreakdown[0]?.count ?? 1
                      const pct = (l.count / maxCount) * 100
                      const totalPct = stats.totalCount > 0 ? Math.round((l.count / stats.totalCount) * 100) : 0
                      return (
                        <div key={l.locality} className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="truncate max-w-[150px]">{l.locality}</span>
                            <span className="font-medium tabular-nums ml-auto flex items-center gap-1">
                              {l.count}
                              <span className="text-[9px] text-muted-foreground">({totalPct}%)</span>
                            </span>
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
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Calendar className="size-3 text-green-600" />
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Výsadba po letech</p>
                    </div>
                    <div className="relative flex items-end gap-1 h-20">
                      {/* Connecting line */}
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-muted" />
                      {stats.yearlyBreakdown.map((y, idx) => {
                        const maxCount = Math.max(...stats.yearlyBreakdown.map(x => x.count))
                        const pct = (y.count / maxCount) * 100
                        return (
                          <div key={y.year} className="flex-1 flex flex-col items-center gap-0.5 relative" title={`${y.year}: ${y.count}`}>
                            <span className="text-[9px] font-medium tabular-nums">{y.count}</span>
                            <div
                              className="w-full rounded-t bg-green-500/70 transition-all duration-500 min-h-[2px] hover:bg-green-500"
                              style={{ height: `${Math.max(pct, 5)}%` }}
                            />
                            <span className="text-[8px] text-muted-foreground">{y.year.slice(2)}</span>
                            {/* Connecting line between bars */}
                            {idx < stats.yearlyBreakdown.length - 1 && (
                              <div className="absolute top-[15%] right-0 translate-x-1/2 w-full h-px bg-green-300/40 dark:bg-green-700/40" />
                            )}
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
