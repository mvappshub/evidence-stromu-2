import { NextResponse } from "next/server"
import { z } from "zod"
import { calculateNextDueAt } from "@/lib/reminder-utils"
import { parseInputDate } from "@/lib/server-date"

export const reminderInputFieldsSchema = z.object({
  text: z.string().min(1, "Reminder text is required"),
  mode: z.enum(["interval", "date"]),
  intervalNum: z.number().int().positive().optional(),
  intervalUnit: z.enum(["day", "week", "month", "year"]).optional(),
  startAt: z.string().optional(),
  dueAt: z.string().optional(),
})

export type ReminderInputFields = z.infer<typeof reminderInputFieldsSchema>

export function validateReminderModeFields(
  mode: ReminderInputFields["mode"],
  intervalNum: number | undefined,
  intervalUnit: ReminderInputFields["intervalUnit"],
  dueAt: string | undefined
) {
  if (mode === "interval" && (!intervalNum || !intervalUnit)) {
    return NextResponse.json(
      { error: "Interval mode requires intervalNum and intervalUnit" },
      { status: 400 }
    )
  }
  if (mode === "date" && !dueAt) {
    return NextResponse.json({ error: "Date mode requires dueAt" }, { status: 400 })
  }
  return null
}

export function parseReminderCreateDates(startAt?: string, dueAt?: string) {
  const parsedStartAt = startAt ? parseInputDate(startAt) : null
  if (startAt && !parsedStartAt) {
    return NextResponse.json({ error: "Invalid startAt date" }, { status: 400 })
  }

  const parsedDueAt = dueAt ? parseInputDate(dueAt) : null
  if (dueAt && !parsedDueAt) {
    return NextResponse.json({ error: "Invalid dueAt date" }, { status: 400 })
  }

  return { parsedStartAt, parsedDueAt }
}

export function buildReminderCreateData(
  fields: ReminderInputFields,
  dates: { parsedStartAt: Date | null; parsedDueAt: Date | null },
  recordNumber: number
) {
  const { text, mode, intervalNum, intervalUnit } = fields
  const { parsedStartAt, parsedDueAt } = dates

  const nextDueAt = calculateNextDueAt(
    mode,
    parsedStartAt,
    intervalNum ?? null,
    intervalUnit ?? null,
    parsedDueAt
  )

  return {
    text,
    mode,
    intervalNum: intervalNum ?? null,
    intervalUnit: intervalUnit ?? null,
    startAt: parsedStartAt,
    dueAt: parsedDueAt,
    nextDueAt,
    recordNumber,
  }
}
