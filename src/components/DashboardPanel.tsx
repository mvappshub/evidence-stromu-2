'use client'

import { useQuery } from '@tanstack/react-query'
import { parseISO, formatDistanceToNow, isPast, isToday } from 'date-fns'
import { cs } from 'date-fns/locale'
import { TreePine, Leaf, CalendarDays, Clock, AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { czechPlural } from '@/lib/czech-plural'
import { cn } from '@/lib/utils'

interface StatsData {
  totalCount: number
  speciesCount: number
  localityCount: number
  lastPlantedAt: string | null
}

interface DueReminder {
  id: string
  nextDueAt: string
  recordNumber: number
  text: string
  record?: { speciesLatin: string }
}

function MetricCard({
  icon: Icon,
  value,
  label,
  accentColor,
  iconBg,
  iconColor,
  isLoading,
}: {
  icon: typeof TreePine
  value: string | number
  label: string
  accentColor: string
  iconBg: string
  iconColor: string
  isLoading?: boolean
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
          {isLoading ? (
            <div className="h-6 w-12 bg-accent animate-pulse rounded" />
          ) : (
            <div className="text-lg font-bold tabular-nums leading-tight truncate">
              {value}
            </div>
          )}
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
  const { data, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ['records-stats-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/records/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    staleTime: 30_000,
  })

  // Records this month
  const { data: thisMonthData } = useQuery<{ count: number }>({
    queryKey: ['records-this-month'],
    queryFn: async () => {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0]
      const today = now.toISOString().split('T')[0]
      const res = await fetch(`/api/records?limit=1&dateFrom=${startOfMonth}&dateTo=${today}`)
      if (!res.ok) throw new Error('Failed')
      const d = await res.json()
      return { count: d.count as number }
    },
    staleTime: 30_000,
  })

  // Overdue reminders count
  const { data: dueData } = useQuery<{ reminders: DueReminder[] }>({
    queryKey: ['reminders-due-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/reminders/due?horizon=14')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    staleTime: 30_000,
  })

  const overdueCount = dueData?.reminders
    ? dueData.reminders.filter((r) => isPast(parseISO(r.nextDueAt)) && !isToday(parseISO(r.nextDueAt))).length
    : 0

  if (!data && statsLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-3 pt-2 pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card py-3 px-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

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
        icon={CalendarDays}
        value={thisMonthData?.count ?? 0}
        label={czechPlural(thisMonthData?.count ?? 0, ['tento měsíc', 'tento měsíc', 'tento měsíc'])}
        accentColor="bg-emerald-500"
        iconBg="bg-emerald-50 dark:bg-emerald-950"
        iconColor="text-emerald-600 dark:text-emerald-400"
        isLoading={thisMonthData === undefined}
      />
      <MetricCard
        icon={overdueCount > 0 ? AlertTriangle : Leaf}
        value={overdueCount > 0 ? overdueCount : data.speciesCount}
        label={overdueCount > 0 ? czechPlural(overdueCount, ['po termínu', 'po termínu', 'po termínu']) : czechPlural(data.speciesCount, ['druh', 'druhy', 'druhů'])}
        accentColor={overdueCount > 0 ? 'bg-red-500' : 'bg-teal-500'}
        iconBg={overdueCount > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-teal-50 dark:bg-teal-950'}
        iconColor={overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-teal-600 dark:text-teal-400'}
      />
      <MetricCard
        icon={Clock}
        value={formatLastPlanted(data.lastPlantedAt)}
        label="Poslední výsadba"
        accentColor="bg-amber-500"
        iconBg="bg-amber-50 dark:bg-amber-950"
        iconColor="text-amber-600 dark:text-amber-400"
      />
    </div>
  )
}
