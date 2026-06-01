'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ReminderEditor } from '@/components/editors/ReminderEditor'
import type { TreeRecord, Reminder } from '@/lib/types'

interface ReminderCellProps {
  record: TreeRecord
}

export function ReminderCell({ record }: ReminderCellProps) {
  const [open, setOpen] = useState(false)
  const reminders = record.reminders ?? []
  const activeCount = reminders.filter((r) => r.active).length

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2"
        onClick={handleClick}
        title={`Připomínky (${activeCount})`}
      >
        <Bell className="size-4 text-muted-foreground" />
        {activeCount > 0 && (
          <Badge
            variant="secondary"
            className="min-w-5 h-5 px-1 text-[10px] justify-center"
          >
            {activeCount}
          </Badge>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Připomínky – záznam #{record.recordNumber}
            </SheetTitle>
            <SheetDescription>
              {record.speciesLatin}
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <ReminderEditor
              recordNumber={record.recordNumber}
              existingReminders={reminders}
              onAfterSubmit={() => {
                // Parent will refetch via TanStack Query invalidation
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
