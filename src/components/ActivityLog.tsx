'use client'

import { useQuery } from '@tanstack/react-query'
import { parseISO, formatDistanceToNow } from 'date-fns'
import { cs } from 'date-fns/locale'
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Bell,
  TreePine,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface Activity {
  id: string
  action: string
  entityType: string
  entityId: string
  details: string | null
  createdAt: string
  userName: string
}

const actionConfig: Record<string, { icon: typeof Plus; label: string; color: string }> = {
  create: { icon: Plus, label: 'Vytvořeno', color: 'text-green-600' },
  update: { icon: Pencil, label: 'Upraveno', color: 'text-blue-600' },
  delete: { icon: Trash2, label: 'Smazáno', color: 'text-red-600' },
  ack: { icon: CheckCircle2, label: 'Připomínka vyřízena', color: 'text-emerald-600' },
}

function formatTimeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: cs })
  } catch {
    return ''
  }
}

function getEntityDescription(activity: Activity): string {
  try {
    const details = activity.details ? JSON.parse(activity.details) : {}
    if (activity.entityType === 'record') {
      if (activity.action === 'create') {
        return `Záznam #${details.recordNumber || activity.entityId} — ${details.speciesLatin || ''}`
      }
      if (activity.action === 'update') {
        return `Záznam #${details.recordNumber || activity.entityId}`
      }
      if (activity.action === 'delete') {
        return `Záznam #${details.recordNumber || activity.entityId} — ${details.speciesLatin || ''}`
      }
    }
    if (activity.entityType === 'reminder') {
      if (activity.action === 'create') {
        return `Připomínka pro strom #${details.recordNumber || '?'}`
      }
      if (activity.action === 'ack') {
        return `Připomínka pro strom #${details.recordNumber || '?'}`
      }
    }
    return activity.entityId
  } catch {
    return activity.entityId
  }
}

export function ActivityLog() {
  const { data, isLoading } = useQuery<{ activities: Activity[] }>({
    queryKey: ['activity-log'],
    queryFn: async () => {
      const res = await fetch('/api/activity-log?limit=50')
      if (!res.ok) throw new Error('Failed to fetch activity log')
      return res.json()
    },
    staleTime: 30_000,
  })

  const activities = data?.activities ?? []

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7" title="Aktivita">
          <Clock className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-green-600" />
            <h3 className="text-sm font-semibold">Aktivita</h3>
          </div>
        </div>
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Načítání…
            </div>
          ) : activities.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-xs">
              Žádná aktivita k zobrazení
            </div>
          ) : (
            <div className="p-2">
              {activities.map((activity, idx) => {
                const config = actionConfig[activity.action] || actionConfig.update
                const Icon = config.icon
                return (
                  <div key={activity.id}>
                    <div className="flex items-start gap-2.5 py-2 px-1.5 rounded-md hover:bg-muted/50 transition-colors">
                      <div className={cn('mt-0.5 shrink-0', config.color)}>
                        <Icon className="size-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                            {config.label}
                          </span>
                          {activity.entityType === 'record' ? (
                            <TreePine className="size-3 text-green-600 shrink-0" />
                          ) : (
                            <Bell className="size-3 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs truncate mt-0.5">
                          {getEntityDescription(activity)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
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
                    {idx < activities.length - 1 && <Separator className="my-0.5" />}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
