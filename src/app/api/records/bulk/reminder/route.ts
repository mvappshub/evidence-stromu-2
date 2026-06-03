import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { buildReminderCreateData, reminderInputFieldsSchema } from "@/lib/reminder-input"
import {
  parseReminderCreateDates,
  validateReminderModeFields,
} from "@/lib/reminder-validation"

function reminderValidationResponse(error: { message: string }) {
  return NextResponse.json({ error: error.message }, { status: 400 })
}

const bulkReminderSchema = reminderInputFieldsSchema.extend({
  recordNumbers: z.array(z.number().int()).min(1, "At least one record number is required"),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const parsed = bulkReminderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { recordNumbers, text, mode, intervalNum, intervalUnit, startAt, dueAt } =
      parsed.data

    const modeResult = validateReminderModeFields(
      mode,
      intervalNum,
      intervalUnit,
      dueAt
    )
    if (!modeResult.ok) return reminderValidationResponse(modeResult.error)

    const datesResult = parseReminderCreateDates(startAt, dueAt)
    if (!datesResult.ok) return reminderValidationResponse(datesResult.error)
    const dates = datesResult.value

    const records = await db.treeRecord.findMany({
      where: {
        recordNumber: { in: recordNumbers },
        createdById: auth.userId,
      },
      select: { recordNumber: true },
    })

    const ownedNumbers = records.map((r) => r.recordNumber)

    if (ownedNumbers.length === 0) {
      return NextResponse.json({ error: "No valid records found" }, { status: 404 })
    }

    const reminderFields = { text, mode, intervalNum, intervalUnit, startAt, dueAt }
    const remindersData = ownedNumbers.map((recordNumber) =>
      buildReminderCreateData(reminderFields, dates, recordNumber)
    )

    const result = await db.reminder.createMany({ data: remindersData })

    await db.activityLog.create({
      data: {
        action: "create",
        entityType: "reminder",
        entityId: ownedNumbers.join(","),
        details: JSON.stringify({
          recordNumbers: ownedNumbers,
          bulkAction: "reminder",
          text: text.slice(0, 100),
          mode,
          count: result.count,
        }),
        userId: auth.userId,
      },
    })

    return NextResponse.json(
      {
        message: `Created ${result.count} reminder(s)`,
        createdCount: result.count,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Bulk reminder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
