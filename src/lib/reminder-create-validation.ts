import { NextResponse } from "next/server"
import type { ReminderInputFields } from "@/lib/reminder-input"
import {
  parseReminderCreateDates,
  validateReminderModeFields,
  type ReminderValidationError,
} from "@/lib/reminder-validation"

export function reminderValidationErrorResponse(error: ReminderValidationError) {
  return NextResponse.json({ error: error.message }, { status: 400 })
}

export type ValidatedReminderCreateResult =
  | {
      ok: true
      fields: ReminderInputFields
      dates: { parsedStartAt: Date | null; parsedDueAt: Date | null }
    }
  | { ok: false; response: NextResponse }

/** Mode + date rules for creating a reminder (shared by single and bulk API). */
export function validateReminderForCreate(
  fields: ReminderInputFields
): ValidatedReminderCreateResult {
  const { mode, intervalNum, intervalUnit, startAt, dueAt } = fields

  const modeResult = validateReminderModeFields(
    mode,
    intervalNum,
    intervalUnit,
    dueAt
  )
  if (!modeResult.ok) {
    return { ok: false, response: reminderValidationErrorResponse(modeResult.error) }
  }

  const datesResult = parseReminderCreateDates(startAt, dueAt)
  if (!datesResult.ok) {
    return { ok: false, response: reminderValidationErrorResponse(datesResult.error) }
  }

  return { ok: true, fields, dates: datesResult.value }
}
