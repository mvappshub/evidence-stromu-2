'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import {
  Bell,
  BellOff,
  Check,
  Pencil,
  Trash2,
  CalendarDays,
  Plus,
} from 'lucide-react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Reminder } from '@/lib/types'

const reminderFormSchema = z.object({
  text: z.string().min(1, 'Zadejte text připomínky'),
  mode: z.enum(['interval', 'date']),
  intervalNum: z.number().int().positive().optional(),
  intervalUnit: z.enum(['day', 'week', 'month', 'year']).optional(),
  startAt: z.string().optional(),
  dueAt: z.string().optional(),
  active: z.boolean(),
})

type ReminderFormValues = z.infer<typeof reminderFormSchema>

interface ReminderEditorProps {
  recordNumber: number
  existingReminders: Reminder[]
  /** If provided, this is in "bulk mode" – recordNumbers is an array */
  recordNumbers?: number[]
  onAfterSubmit?: () => void
}

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

export function ReminderEditor({
  recordNumber,
  existingReminders,
  recordNumbers,
  onAfterSubmit,
}: ReminderEditorProps) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [startCalendarOpen, setStartCalendarOpen] = useState(false)

  const isBulk = !!recordNumbers && recordNumbers.length > 0

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      text: '',
      mode: 'interval',
      intervalNum: 1,
      intervalUnit: 'month',
      startAt: '',
      dueAt: '',
      active: true,
    },
  })

  const watchMode = form.watch('mode')
  const watchStartAt = form.watch('startAt') ?? ''
  const watchDueAt = form.watch('dueAt') ?? ''

  // Create reminder mutation
  const createMutation = useMutation({
    mutationFn: async (data: ReminderFormValues) => {
      if (isBulk) {
        const res = await fetch('/api/records/bulk/reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordNumbers,
            text: data.text,
            mode: data.mode,
            intervalNum: data.mode === 'interval' ? data.intervalNum : undefined,
            intervalUnit: data.mode === 'interval' ? data.intervalUnit : undefined,
            startAt: data.startAt || undefined,
            dueAt: data.mode === 'date' ? data.dueAt : undefined,
          }),
        })
        if (!res.ok) throw new Error('Chyba při vytváření připomínky')
        return res.json()
      } else {
        const res = await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordNumber,
            text: data.text,
            mode: data.mode,
            intervalNum: data.mode === 'interval' ? data.intervalNum : undefined,
            intervalUnit: data.mode === 'interval' ? data.intervalUnit : undefined,
            startAt: data.startAt || undefined,
            dueAt: data.mode === 'date' ? data.dueAt : undefined,
          }),
        })
        if (!res.ok) throw new Error('Chyba při vytváření připomínky')
        return res.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      form.reset()
      onAfterSubmit?.()
      toast.success('Připomínka vytvořena')
    },
    onError: (error) => {
      toast.error('Chyba', { description: error.message })
    },
  })

  // Update reminder mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReminderFormValues> }) => {
      const res = await fetch(`/api/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Chyba při úpravě připomínky')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      setEditingId(null)
      onAfterSubmit?.()
      toast.success('Připomínka aktualizována')
    },
    onError: (error) => {
      toast.error('Chyba', { description: error.message })
    },
  })

  // Delete reminder mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reminders/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Chyba při mazání připomínky')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      onAfterSubmit?.()
      toast.success('Připomínka smazána')
    },
    onError: (error) => {
      toast.error('Chyba', { description: error.message })
    },
  })

  // Acknowledge reminder mutation
  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reminders/${id}/ack`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Chyba při potvrzení připomínky')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      queryClient.invalidateQueries({ queryKey: ['reminders-due'] })
      onAfterSubmit?.()
      toast.success('Připomínka vyřízena')
    },
    onError: (error) => {
      toast.error('Chyba', { description: error.message })
    },
  })

  const onSubmit = (data: ReminderFormValues) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (reminder: Reminder) => {
    setEditingId(reminder.id)
    form.reset({
      text: reminder.text,
      mode: reminder.mode,
      intervalNum: reminder.intervalNum ?? 1,
      intervalUnit: reminder.intervalUnit ?? 'month',
      startAt: reminder.startAt ? reminder.startAt.slice(0, 10) : '',
      dueAt: reminder.dueAt ? reminder.dueAt.slice(0, 10) : '',
      active: reminder.active,
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    form.reset({
      text: '',
      mode: 'interval',
      intervalNum: 1,
      intervalUnit: 'month',
      startAt: '',
      dueAt: '',
      active: true,
    })
  }

  return (
    <div className="space-y-4">
      {/* Existing reminders list */}
      {existingReminders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Stávající připomínky</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {existingReminders.map((reminder) => (
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
                      onClick={() => ackMutation.mutate(reminder.id)}
                      title="Potvrdit (odsunout na další termín)"
                    >
                      <Check className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleEdit(reminder)}
                    title="Upravit"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(reminder.id)}
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
      )}

      {/* New/Edit reminder form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <h4 className="text-sm font-medium">
          {editingId ? 'Upravit připomínku' : 'Nová připomínka'}
        </h4>

        <div className="space-y-1.5">
          <Label htmlFor="reminder-text" className="text-xs">Co se má udělat</Label>
          <Input
            id="reminder-text"
            placeholder="Zalít strom, zkontrolovat výšku…"
            className="h-8 text-sm"
            {...form.register('text')}
          />
          {form.formState.errors.text && (
            <p className="text-xs text-destructive">
              {form.formState.errors.text.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Typ připomínky</Label>
          <RadioGroup
            value={watchMode}
            onValueChange={(val) =>
              form.setValue('mode', val as 'interval' | 'date')
            }
            className="flex gap-4"
          >
            <div className="flex items-center space-x-1.5">
              <RadioGroupItem value="interval" id="mode-interval" />
              <Label htmlFor="mode-interval" className="text-xs cursor-pointer">
                Opakovaná
              </Label>
            </div>
            <div className="flex items-center space-x-1.5">
              <RadioGroupItem value="date" id="mode-date" />
              <Label htmlFor="mode-date" className="text-xs cursor-pointer">
                Jednorázová
              </Label>
            </div>
          </RadioGroup>
        </div>

        {watchMode === 'interval' && (
          <div className="flex items-end gap-2">
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs">Opakovat každých</Label>
              <Input
                type="number"
                min={1}
                className="h-8 text-sm w-20"
                {...form.register('intervalNum', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs">&nbsp;</Label>
              <Select
                value={form.watch('intervalUnit')}
                onValueChange={(val) =>
                  form.setValue('intervalUnit', val as 'day' | 'week' | 'month' | 'year')
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">dnů</SelectItem>
                  <SelectItem value="week">týdnů</SelectItem>
                  <SelectItem value="month">měsíců</SelectItem>
                  <SelectItem value="year">let</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {watchMode === 'interval' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Začátek (volitelné)</Label>
            <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'h-8 text-sm justify-start text-left font-normal w-full',
                    !watchStartAt && 'text-muted-foreground'
                  )}
                >
                  <CalendarDays className="mr-2 size-3.5" />
                  {watchStartAt
                    ? format(new Date(watchStartAt), 'd.M.yyyy', { locale: cs })
                    : 'Vyberte datum'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    watchStartAt
                      ? new Date(watchStartAt)
                      : undefined
                  }
                  onSelect={(date) => {
                    form.setValue(
                      'startAt',
                      date ? format(date, 'yyyy-MM-dd') : ''
                    )
                    setStartCalendarOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {watchMode === 'date' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Datum splnění</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'h-8 text-sm justify-start text-left font-normal w-full',
                    !watchDueAt && 'text-muted-foreground'
                  )}
                >
                  <CalendarDays className="mr-2 size-3.5" />
                  {watchDueAt
                    ? format(new Date(watchDueAt), 'd.M.yyyy', { locale: cs })
                    : 'Vyberte datum'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    watchDueAt
                      ? new Date(watchDueAt)
                      : undefined
                  }
                  onSelect={(date) => {
                    form.setValue(
                      'dueAt',
                      date ? format(date, 'yyyy-MM-dd') : ''
                    )
                    setCalendarOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Switch
            checked={form.watch('active')}
            onCheckedChange={(checked) => form.setValue('active', checked)}
          />
          <Label className="text-xs cursor-pointer">Aktivní</Label>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="submit"
            size="sm"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="gap-1"
          >
            <Plus className="size-3.5" />
            {editingId ? 'Uložit změny' : 'Přidat připomínku'}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
            >
              Zrušit
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
