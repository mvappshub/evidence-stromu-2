'use client'

import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import {
  Bell,
  BellOff,
  Check,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { Reminder } from '@/lib/types'

const unitLabels: Record<string, string> = {
  day: 'den',
  week: 'týden',
  month: 'měsíc',
  year: 'rok',
}

const unitPluralLabels: Record<string, string> = {
  day: 'dny',
  week: 'týdny',
  month: 'měsíce',
  year: 'roky',
}

interface ExistingRemindersListProps {
  reminders: Reminder[]
  onAck: (id: string) => void
  onEdit: (reminder: Reminder) => void
  onDelete: (id: string) => void
}

export function ExistingRemindersList({
  reminders,
  onAck,
  onEdit,
  onDelete,
}: ExistingRemindersListProps) {
  if (reminders.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Stávající připomínky</h4>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className={cn(
              'flex items-start gap-2 rounded-md border p-2 text-sm',
              !reminder.active && 'opacity-50'
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{reminder.text}</p>
              <p className="text-xs text-muted-foreground">
                {reminder.mode === 'interval'
                  ? `Každé ${reminder.intervalNum} ${
                      reminder.intervalNum === 1
                        ? unitLabels[reminder.intervalUnit ?? 'day']
                        : unitPluralLabels[reminder.intervalUnit ?? 'day']
                    }`
                  : `Datum: ${reminder.dueAt ? format(new Date(reminder.dueAt), 'd.M.yyyy', { locale: cs }) : '—'}`}
                {' · '}
                Další: {format(new Date(reminder.nextDueAt), 'd.M.yyyy', { locale: cs })}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {reminder.active && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => onAck(reminder.id)}
                  title="Potvrdit (odsunout na další termín)"
                >
                  <Check className="size-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onEdit(reminder)}
                title="Upravit"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(reminder.id)}
                title="Smazat"
              >
                <Trash2 className="size-3.5" />
              </Button>
              <Badge variant={reminder.active ? 'default' : 'secondary'} className="text-[10px]">
                {reminder.active ? (
                  <><Bell className="size-3 mr-0.5" /> Aktivní</>
                ) : (
                  <><BellOff className="size-3 mr-0.5" /> Neaktivní</>
                )}
              </Badge>
            </div>
          </div>
        ))}
      </div>
      <Separator />
    </div>
  )
}
