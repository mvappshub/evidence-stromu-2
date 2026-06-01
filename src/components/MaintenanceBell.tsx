'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isPast, isToday, addDays, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Bell, Check, MapPin, ExternalLink, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useUiStore } from '@/store/useUiStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface DueReminder {
  id: string
  text: string
  mode: string
  intervalNum: number | null
  intervalUnit: string | null
  nextDueAt: string
  active: boolean
  recordNumber: number
  record?: {
    recordNumber: number
    speciesLatin: string
    lat: number
    lng: number
  }
}

export function MaintenanceBell() {
  const queryClient = useQueryClient()
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const setViewMode = useUiStore((s) => s.setViewMode)

  const { data: dueData, isLoading } = useQuery({
    queryKey: ['reminders-due'],
    queryFn: async () => {
      const res = await fetch('/api/reminders/due?horizon=14')
      if (!res.ok) throw new Error('Failed to fetch reminders')
      const data = await res.json()
      return (data.reminders ?? data) as DueReminder[]
    },
    refetchInterval: 60_000, // polling every 60s
  })

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reminders/${id}/ack`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to acknowledge')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders-due'] })
      queryClient.invalidateQueries({ queryKey: ['records'] })
      toast.success('Připomínka vyřízena')
    },
    onError: () => {
      toast.error('Chyba při potvrzování')
    },
  })

  const reminders = Array.isArray(dueData) ? dueData : []
  const overdue = reminders.filter((r) => isPast(parseISO(r.nextDueAt)) && !isToday(parseISO(r.nextDueAt)))
  const today = reminders.filter((r) => isToday(parseISO(r.nextDueAt)))
  const upcoming = reminders.filter((r) => !isPast(parseISO(r.nextDueAt)) && !isToday(parseISO(r.nextDueAt)))
  const totalCount = reminders.length

  const handleGoToRecord = (recordNumber: number) => {
    setSelectedRecordNumber(recordNumber)
    setViewMode('both')
  }

  const unitLabels: Record<string, string> = {
    day: 'den',
    week: 'týden',
    month: 'měsíc',
    year: 'rok',
  }

  const renderReminderItem = (reminder: DueReminder) => {
    const isOverdue = isPast(parseISO(reminder.nextDueAt)) && !isToday(parseISO(reminder.nextDueAt))
    const isDueToday = isToday(parseISO(reminder.nextDueAt))

    return (
      <div
        key={reminder.id}
        className={cn(
          'flex items-start gap-2 rounded-md border p-2 text-sm',
          isOverdue && 'border-destructive/50 bg-destructive/5',
          isDueToday && 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20'
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-xs truncate">{reminder.text}</p>
          <p className="text-[10px] text-muted-foreground">
            Strom #{reminder.recordNumber}
            {reminder.record && ` · ${reminder.record.speciesLatin}`}
            {' · '}
            <span className={cn(isOverdue && 'text-destructive font-medium')}>
              {isDueToday ? 'Dnes' : format(parseISO(reminder.nextDueAt), 'd.M.yyyy', { locale: cs })}
            </span>
            {reminder.mode === 'interval' && (
              <span className="ml-1">
                (každé {reminder.intervalNum} {unitLabels[reminder.intervalUnit ?? 'day']})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => handleGoToRecord(reminder.recordNumber)}
            title="Přejít na strom"
          >
            <MapPin className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-green-600 hover:text-green-700"
            onClick={() => ackMutation.mutate(reminder.id)}
            title="Vyřízeno"
            disabled={ackMutation.isPending}
          >
            <Check className="size-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8">
          <Bell className="size-4" />
          {totalCount > 0 && (
            <Badge
              variant={overdue.length > 0 ? 'destructive' : 'secondary'}
              className="absolute -top-1 -right-1 size-4 min-w-4 p-0 text-[9px] flex items-center justify-center"
            >
              {totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Připomínky údržby</h3>
            {isLoading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          </div>
        </div>
        <ScrollArea className="max-h-96">
          {reminders.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-xs">
              Žádné připomínky k vyřízení
            </div>
          ) : (
            <div className="p-2 space-y-3">
              {overdue.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase text-destructive tracking-wider px-1">
                    Po termínu ({overdue.length})
                  </p>
                  {overdue.map(renderReminderItem)}
                </div>
              )}
              {today.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase text-yellow-600 tracking-wider px-1">
                    Dnes ({today.length})
                  </p>
                  {today.map(renderReminderItem)}
                </div>
              )}
              {upcoming.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider px-1">
                    Nadcházející ({upcoming.length})
                  </p>
                  {upcoming.map(renderReminderItem)}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
