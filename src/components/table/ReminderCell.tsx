'use client'

import { Bell } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ReminderEditor } from '@/components/editors/ReminderEditor'
import { useQueryClient } from '@tanstack/react-query'
import type { TreeRecord } from '@/lib/types'
interface ReminderCellProps {
  record: TreeRecord
}

export function ReminderCell({ record }: ReminderCellProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const reminders = record.reminders ?? []
  const activeCount = reminders.filter((r) => r.active).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2"
          onClick={(e) => e.stopPropagation()}
          type="button"
        >
          <Bell className="size-3 text-muted-foreground" />
          {activeCount > 0 && (
            <Badge variant="secondary" className="min-w-5 h-5 px-1 text-[10px] justify-center">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      {open && (
        <PopoverContent
          className="w-80 p-3 rounded-sm max-h-[320px] overflow-y-auto"
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-mono text-muted-foreground mb-2">
            připomínky · #{record.recordNumber}
          </p>
          <ReminderEditor
            recordNumber={record.recordNumber}
            existingReminders={reminders}
            onAfterSubmit={() => {
              queryClient.invalidateQueries({ queryKey: ['records'] })
              queryClient.invalidateQueries({ queryKey: ['record', record.recordNumber] })
            }}
          />
        </PopoverContent>
      )}
    </Popover>
  )
}
