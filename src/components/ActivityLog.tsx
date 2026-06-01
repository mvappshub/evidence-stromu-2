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
  Check,
  Bell,
  TreePine,
  Loader2,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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

const actionConfig: Record<string, { icon: typeof Plus; label: string; dotColor: string; bgColor: string }> = {
  create: { icon: Plus, label: 'Vytvořeno', dotColor: 'bg-green-500', bgColor: 'text-green-600 dark:text-green-400' },
  update: { icon: Pencil, label: 'Upraveno', dotColor: 'bg-amber-500', bgColor: 'text-amber-600 dark:text-amber-400' },
  delete: { icon: Trash2, label: 'Smazáno', dotColor: 'bg-red-500', bgColor: 'text-red-600 dark:text-red-400' },
  ack: { icon: Check, label: 'Vyřízeno', dotColor: 'bg-blue-500', bgColor: 'text-blue-600 dark:text-blue-400' },
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
        'relative flex gap-3 group',
        isRecord && 'cursor-pointer'
      )}
      onClick={handleClick}
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            'size-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-background',
            activity.action === 'create' && 'bg-green-100 dark:bg-green-950',
            activity.action === 'update' && 'bg-amber-100 dark:bg-amber-950',
            activity.action === 'delete' && 'bg-red-100 dark:bg-red-950',
            activity.action === 'ack' && 'bg-blue-100 dark:bg-blue-950',
          )}
        >
          <Icon className={cn('size-3.5', config.bgColor)} />
        </div>
        {/* Vertical line */}
        <div className="w-px flex-1 bg-border min-h-4" />
      </div>

      {/* Content */}
      <div className={cn(
        'pb-4 min-w-0 flex-1',
        isRecord && 'group-hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors'
      )}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn('text-[11px] font-semibold', config.bgColor)}>
            {config.label}
          </span>
          {isRecord ? (
            <Badge variant="outline" className="h-4 px-1 text-[9px] gap-0.5 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
              <TreePine className="size-2.5" />
              Záznam
            </Badge>
          ) : (
            <Badge variant="outline" className="h-4 px-1 text-[9px] gap-0.5 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
              <Bell className="size-2.5" />
              Připomínka
            </Badge>
          )}
        </div>
        <p className="text-xs truncate">
          {getEntityDescription(activity)}
        </p>
        {activity.recordLocality && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            📍 {activity.recordLocality}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">
            {formatTimeAgo(activity.createdAt)}
          </span>
          {activity.userName && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground truncate">
                {activity.userName}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function ActivityLog() {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)

  const { data, isLoading } = useQuery<ActivityResponse>({
    queryKey: ['activity-log', filter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (filter === 'records') params.set('entityType', 'record')
      if (filter === 'reminders') params.set('entityType', 'reminder')
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7" title="Aktivita">
          <Clock className="size-3.5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-96 sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <Activity className="size-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <SheetTitle className="text-sm">Panel aktivit</SheetTitle>
              <SheetDescription className="text-[11px]">
                Přehled posledních akcí v aplikaci
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Filter tabs */}
        <div className="px-4 pt-3">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="w-full h-8">
              <TabsTrigger value="all" className="text-xs flex-1">Vše</TabsTrigger>
              <TabsTrigger value="records" className="text-xs flex-1">Záznamy</TabsTrigger>
              <TabsTrigger value="reminders" className="text-xs flex-1">Připomínky</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Timeline content */}
        <ScrollArea className="flex-1 max-h-[calc(100vh-200px)]">
          <div className="px-4 py-3">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-8">
                <Loader2 className="size-3.5 animate-spin" />
                Načítání…
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <div className="size-14 rounded-full bg-muted/50 flex items-center justify-center">
                  <Activity className="size-6 text-muted-foreground/50" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Žádná aktivita</p>
                  <p className="text-xs mt-1">Zde se zobrazí provedené akce</p>
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
      </SheetContent>
    </Sheet>
  )
}
