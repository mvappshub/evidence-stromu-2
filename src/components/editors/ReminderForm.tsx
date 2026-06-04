'use client'

import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { type UseFormReturn } from 'react-hook-form'
import { CalendarDays, Plus } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import type { ReminderFormValues } from '@/hooks/useReminderActions'

interface ReminderFormProps {
  editingId: string | null
  form: UseFormReturn<ReminderFormValues>
  calendarOpen: boolean
  setCalendarOpen: (open: boolean) => void
  startCalendarOpen: boolean
  setStartCalendarOpen: (open: boolean) => void
  onSubmit: (data: ReminderFormValues) => void
  onCancelEdit: () => void
  isSubmitting: boolean
}

export function ReminderForm({
  editingId,
  form,
  calendarOpen,
  setCalendarOpen,
  startCalendarOpen,
  setStartCalendarOpen,
  onSubmit,
  onCancelEdit,
  isSubmitting,
}: ReminderFormProps) {
  const watchMode = form.watch('mode')
  const watchStartAt = form.watch('startAt') ?? ''
  const watchDueAt = form.watch('dueAt') ?? ''

  return (
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
                selected={watchStartAt ? new Date(watchStartAt) : undefined}
                onSelect={(date) => {
                  form.setValue('startAt', date ? format(date, 'yyyy-MM-dd') : '')
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
                selected={watchDueAt ? new Date(watchDueAt) : undefined}
                onSelect={(date) => {
                  form.setValue('dueAt', date ? format(date, 'yyyy-MM-dd') : '')
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
          disabled={isSubmitting}
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
            onClick={onCancelEdit}
          >
            Zrušit
          </Button>
        )}
      </div>
    </form>
  )
}
