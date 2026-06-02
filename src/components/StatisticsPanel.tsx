'use client'

import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'
import { TreePine, Calendar, MapPin } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
interface Stats {
  totalCount: number
  speciesBreakdown: { species: string; count: number }[]
  dateRange: { earliest: string | null; latest: string | null }
  localityBreakdown: { locality: string | null; count: number }[]
  yearlyBreakdown: { year: string | null; count: number }[]
}

interface StatisticsPanelProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function StatisticsPanel({ open, onOpenChange }: StatisticsPanelProps) {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['records-stats'],
    queryFn: async () => {
      const res = await fetch('/api/records/stats')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    staleTime: 30_000,
  })

  const yearlyBreakdown = (stats?.yearlyBreakdown ?? []).filter(
    (item): item is { year: string; count: number } =>
      typeof item.year === 'string' && item.year.length > 0
  )
  const maxYearlyCount = Math.max(1, ...yearlyBreakdown.map((item) => item.count))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-96 max-w-[calc(100vw-2rem)] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-sm font-medium">Statistiky</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[420px]">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Načítání…</div>
          ) : stats ? (
            <div className="p-4 space-y-4">
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
                  <TreePine className="size-3 text-muted-foreground" />
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
                          className="h-full rounded-sm bg-foreground/25 transition-colors"
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
                      <MapPin className="size-3 text-muted-foreground" />
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
                              className="h-full rounded-sm bg-foreground/20 transition-colors"
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
              {yearlyBreakdown.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Calendar className="size-3 text-muted-foreground" />
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Výsadba po letech</p>
                    </div>
                    <div className="relative flex items-end gap-1 h-20">
                      {/* Connecting line */}
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-muted" />
                      {yearlyBreakdown.map((y, idx) => {
                        const pct = (y.count / maxYearlyCount) * 100
                        const shortYear = y.year.slice(-2)
                        return (
                          <div key={y.year} className="flex-1 flex flex-col items-center gap-0.5 relative" title={`${y.year}: ${y.count}`}>
                            <span className="text-[9px] font-medium tabular-nums">{y.count}</span>
                            <div
                              className="w-full rounded-t bg-foreground/30 min-h-[2px] hover:bg-foreground/40"
                              style={{ height: `${Math.max(pct, 5)}%` }}
                            />
                            <span className="text-[8px] text-muted-foreground">{shortYear}</span>
                            {/* Connecting line between bars */}
                            {idx < yearlyBreakdown.length - 1 && (
                              <div className="absolute top-[15%] right-0 translate-x-1/2 w-full h-px bg-border/60" />
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
      </DialogContent>
    </Dialog>
  )
}
