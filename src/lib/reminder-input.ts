import { z } from "zod"
import { calculateNextDueAt } from "@/lib/reminder-utils"

export const reminderInputFieldsSchema = z.object({
  text: z.string().min(1, "Reminder text is required"),
  mode: z.enum(["interval", "date"]),
  intervalNum: z.number().int().positive().optional(),
  intervalUnit: z.enum(["day", "week", "month", "year"]).optional(),
  startAt: z.string().optional(),
  dueAt: z.string().optional(),
})

export type ReminderInputFields = z.infer<typeof reminderInputFieldsSchema>

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
