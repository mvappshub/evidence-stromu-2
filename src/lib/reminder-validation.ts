import type { ReminderInputFields } from "@/lib/reminder-input"
import { parseInputDate } from "@/lib/server-date"

export type ReminderValidationError = { message: string }

export type ReminderValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ReminderValidationError }

export function validateReminderModeFields(
  mode: ReminderInputFields["mode"],
  intervalNum: number | undefined,
  intervalUnit: ReminderInputFields["intervalUnit"],
  dueAt: string | undefined
): ReminderValidationResult<void> {
  if (mode === "interval" && (!intervalNum || !intervalUnit)) {
    return {
      ok: false,
      error: {
        message: "Interval mode requires intervalNum and intervalUnit",
      },
    }
  }
  if (mode === "date" && !dueAt) {
    return {
      ok: false,
      error: { message: "Date mode requires dueAt" },
    }
  }
  return { ok: true, value: undefined }
}

export function parseReminderCreateDates(
  startAt?: string,
  dueAt?: string
): ReminderValidationResult<{
  parsedStartAt: Date | null
  parsedDueAt: Date | null
}> {
  const parsedStartAt = startAt ? parseInputDate(startAt) : null
  if (startAt && !parsedStartAt) {
    return {
      ok: false,
      error: { message: "Invalid startAt date" },
    }
  }

  const parsedDueAt = dueAt ? parseInputDate(dueAt) : null
  if (dueAt && !parsedDueAt) {
    return {
      ok: false,
      error: { message: "Invalid dueAt date" },
    }
  }

  return { ok: true, value: { parsedStartAt, parsedDueAt } }
}
