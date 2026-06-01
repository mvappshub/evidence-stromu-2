'use client'

import { useQuery } from '@tanstack/react-query'
import { parseISO, formatDistanceToNow } from 'date-fns'
import { cs } from 'date-fns/locale'
import { TreePine, Leaf, MapPin, CalendarDays } from 'lucide-react'
import { czechPlural } from '@/lib/czech-plural'
import { cn } from '@/lib/utils'

interface StatsData {
  totalCount: number
  speciesCount: number
  localityCount: number
  lastPlantedAt: string | null
}

function MetricCard({
  icon: Icon,
  value,
  label,
  accentColor,
  iconBg,
  iconColor,
}: {
  icon: typeof TreePine
  value: string | number
  label: string
  accentColor: string
  iconBg: string
  iconColor: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border bg-card py-3 px-4',
        'transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md',
        'group cursor-default'
      )}
    >
      {/* Left accent bar */}
      <div
        className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-lg', accentColor)}
      />

      <div className="flex items-center gap-3">
        {/* Icon in colored circle */}
        <div
          className={cn(
            'shrink-0 size-8 rounded-full flex items-center justify-center',
            iconBg
          )}
        >
          <Icon className={cn('size-4', iconColor)} />
        </div>

        {/* Value and label */}
        <div className="min-w-0">
          <div className="text-lg font-bold tabular-nums leading-tight truncate">
            {value}
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            {label}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatLastPlanted(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: cs })
  } catch {
    return '—'
  }
}

export function DashboardPanel() {
  const { data } = useQuery<StatsData>({
    queryKey: ['records-stats-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/records/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    staleTime: 30_000,
  })

  if (!data) return null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-3 pt-2 pb-1">
      <MetricCard
        icon={TreePine}
        value={data.totalCount}
        label={czechPlural(data.totalCount, ['strom', 'stromy', 'stromů'])}
        accentColor="bg-green-500"
        iconBg="bg-green-50 dark:bg-green-950"
        iconColor="text-green-600 dark:text-green-400"
      />
      <MetricCard
        icon={Leaf}
        value={data.speciesCount}
        label={czechPlural(data.speciesCount, ['druh', 'druhy', 'druhů'])}
        accentColor="bg-emerald-500"
        iconBg="bg-emerald-50 dark:bg-emerald-950"
        iconColor="text-emerald-600 dark:text-emerald-400"
      />
      <MetricCard
        icon={MapPin}
        value={data.localityCount}
        label={czechPlural(data.localityCount, ['lokalita', 'lokality', 'lokalit'])}
        accentColor="bg-teal-500"
        iconBg="bg-teal-50 dark:bg-teal-950"
        iconColor="text-teal-600 dark:text-teal-400"
      />
      <MetricCard
        icon={CalendarDays}
        value={formatLastPlanted(data.lastPlantedAt)}
        label="Poslední výsadba"
        accentColor="bg-amber-500"
        iconBg="bg-amber-50 dark:bg-amber-950"
        iconColor="text-amber-600 dark:text-amber-400"
      />
    </div>
  )
}
