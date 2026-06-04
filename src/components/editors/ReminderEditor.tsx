'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Reminder } from '@/lib/types'
import { useReminderActions, type ReminderFormValues } from '@/hooks/useReminderActions'
import { ExistingRemindersList } from '@/components/editors/ExistingRemindersList'
import { ReminderForm } from '@/components/editors/ReminderForm'

const reminderFormSchema = z.object({
  text: z.string().min(1, 'Zadejte text připomínky'),
  mode: z.enum(['interval', 'date']),
  intervalNum: z.number().int().positive().optional(),
  intervalUnit: z.enum(['day', 'week', 'month', 'year']).optional(),
  startAt: z.string().optional(),
  dueAt: z.string().optional(),
  active: z.boolean(),
})

interface ReminderEditorProps {
  recordNumber: number
  existingReminders: Reminder[]
  /** If provided, this is in "bulk mode" – recordNumbers is an array */
  recordNumbers?: number[]
  onAfterSubmit?: () => void
}

export function ReminderEditor({
  recordNumber,
  existingReminders,
  recordNumbers,
  onAfterSubmit,
}: ReminderEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [startCalendarOpen, setStartCalendarOpen] = useState(false)

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

  const { createMutation, updateMutation, deleteMutation, ackMutation } = useReminderActions({
    recordNumber,
    recordNumbers,
    onAfterSubmit: () => {
      form.reset()
      onAfterSubmit?.()
    },
    onAfterUpdate: () => {
      setEditingId(null)
      onAfterSubmit?.()
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
      <ExistingRemindersList
        reminders={existingReminders}
        onAck={(id) => ackMutation.mutate(id)}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
      <ReminderForm
        editingId={editingId}
        form={form}
        calendarOpen={calendarOpen}
        setCalendarOpen={setCalendarOpen}
        startCalendarOpen={startCalendarOpen}
        setStartCalendarOpen={setStartCalendarOpen}
        onSubmit={onSubmit}
        onCancelEdit={handleCancelEdit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
