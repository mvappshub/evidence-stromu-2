'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { parseISO, formatDistanceToNow } from 'date-fns'
import { cs } from 'date-fns/locale'
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  Bell,
  TreePine,
  Loader2,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/useUiStore'

interface ActivityEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  details: string | null
  createdAt: string
  userName: string
  recordSpecies?: string | null
  recordLocality?: string | null
}

interface ActivityResponse {
  activities: ActivityEntry[]
}

const actionConfig: Record<string, { icon: typeof Plus; label: string; bgColor: string; ringColor: string }> = {
  create: { icon: Plus, label: 'Vytvořeno', bgColor: 'text-green-600 dark:text-green-400', ringColor: 'ring-green-200 dark:ring-green-800 bg-green-50 dark:bg-green-950/50' },
  update: { icon: Pencil, label: 'Upraveno', bgColor: 'text-amber-600 dark:text-amber-400', ringColor: 'ring-amber-200 dark:ring-amber-800 bg-amber-50 dark:bg-amber-950/50' },
  delete: { icon: Trash2, label: 'Smazáno', bgColor: 'text-red-600 dark:text-red-400', ringColor: 'ring-red-200 dark:ring-red-800 bg-red-50 dark:bg-red-950/50' },
  ack: { icon: CheckCircle, label: 'Vyřízeno', bgColor: 'text-blue-600 dark:text-blue-400', ringColor: 'ring-blue-200 dark:ring-blue-800 bg-blue-50 dark:bg-blue-950/50' },
}

function formatTimeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: cs })
  } catch {
    return ''
  }
}

function getEntityDescription(activity: ActivityEntry): string {
  if (activity.entityType === 'record') {
    const rn = activity.entityId
    const species = activity.recordSpecies
    if (species) return `Záznam #${rn} — ${species}`
    return `Záznam #${rn}`
  }
  if (activity.entityType === 'reminder') {
    try {
      const details = activity.details ? JSON.parse(activity.details) : {}
      return `Připomínka pro strom #${details.recordNumber || '?'}`
    } catch {
      return 'Připomínka'
    }
  }
  return activity.entityId
}

function TimelineEntry({
  activity,
  onSelectRecord,
}: {
  activity: ActivityEntry
  onSelectRecord: (recordNumber: number) => void
}) {
  const config = actionConfig[activity.action] || actionConfig.update
  const Icon = config.icon
  const isRecord = activity.entityType === 'record'

  const handleClick = () => {
    if (isRecord) {
      const rn = parseInt(activity.entityId, 10)
      if (!isNaN(rn)) {
        onSelectRecord(rn)
      }
    }
  }

  return (
    <div
      className={cn(
        'relative flex gap-2.5 group',
        isRecord && 'cursor-pointer'
      )}
      onClick={handleClick}
    >
      {/* Timeline line + icon */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            'size-6 rounded-full flex items-center justify-center shrink-0 z-10 ring-1',
            config.ringColor
          )}
        >
          <Icon className={cn('size-3', config.bgColor)} />
        </div>
        {/* Vertical line */}
        <div className="w-px flex-1 bg-border/60 min-h-3" />
      </div>

      {/* Content */}
      <div className={cn(
        'pb-3 min-w-0 flex-1',
        isRecord && 'group-hover:bg-muted/40 rounded-md px-1.5 -mx-1.5 transition-colors'
      )}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn('text-[10px] font-semibold', config.bgColor)}>
            {config.label}
          </span>
          {isRecord ? (
            <Badge variant="outline" className="h-3.5 px-1 text-[8px] gap-0.5 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
              <TreePine className="size-2" />
              Strom
            </Badge>
          ) : (
            <Badge variant="outline" className="h-3.5 px-1 text-[8px] gap-0.5 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
              <Bell className="size-2" />
              Připomínka
            </Badge>
          )}
        </div>
        <p className="text-[11px] truncate leading-snug">
          {getEntityDescription(activity)}
        </p>
        {activity.recordLocality && (
          <p className="text-[9px] text-muted-foreground truncate mt-0.5">
            📍 {activity.recordLocality}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] text-muted-foreground">
            {formatTimeAgo(activity.createdAt)}
          </span>
          {activity.userName && (
            <>
              <span className="text-[9px] text-muted-foreground/50">·</span>
              <span className="text-[9px] text-muted-foreground truncate">
                {activity.userName}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-2.5">
          <div className="flex flex-col items-center shrink-0">
            <Skeleton className="size-6 rounded-full" />
            <div className="w-px flex-1 bg-border/40 min-h-3" />
          </div>
          <div className="flex-1 space-y-1.5 pb-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-2 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ActivityLog() {
  const [open, setOpen] = useState(false)
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)

  const { data, isLoading } = useQuery<ActivityResponse>({
    queryKey: ['activity-log'],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      const res = await fetch(`/api/activity-log?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch activity log')
      return res.json()
    },
    staleTime: 30_000,
    enabled: open,
  })

  const activities = data?.activities ?? []

  const handleSelectRecord = (recordNumber: number) => {
    setSelectedRecordNumber(recordNumber)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7" title="Aktivita">
          <Clock className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <Activity className="size-3 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs font-semibold">Panel aktivit</p>
              <p className="text-[9px] text-muted-foreground">
                Přehled posledních akcí
              </p>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-96">
          <div className="p-3">
            {isLoading ? (
              <ActivitySkeleton />
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center">
                  <Activity className="size-4 text-muted-foreground/50" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium">Žádná aktivita</p>
                  <p className="text-[10px] mt-0.5">Zde se zobrazí provedené akce</p>
                </div>
              </div>
            ) : (
              <div>
                {activities.map((activity) => (
                  <TimelineEntry
                    key={activity.id}
                    activity={activity}
                    onSelectRecord={handleSelectRecord}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
