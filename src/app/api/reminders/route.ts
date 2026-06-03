import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import {
  buildReminderCreateData,
  parseReminderCreateDates,
  reminderInputFieldsSchema,
  validateReminderModeFields,
} from "@/lib/reminder-input"

const createReminderSchema = reminderInputFieldsSchema.extend({
  recordNumber: z.number().int("Record number is required"),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const parsed = createReminderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { recordNumber, text, mode, intervalNum, intervalUnit, startAt, dueAt } =
      parsed.data

    const modeError = validateReminderModeFields(mode, intervalNum, intervalUnit, dueAt)
    if (modeError) return modeError

    const dates = parseReminderCreateDates(startAt, dueAt)
    if (dates instanceof NextResponse) return dates

    const record = await db.treeRecord.findFirst({
      where: { recordNumber, createdById: auth.userId },
    })
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    const reminder = await db.reminder.create({
      data: buildReminderCreateData(
        { text, mode, intervalNum, intervalUnit, startAt, dueAt },
        dates,
        recordNumber
      ),
    })

    await db.activityLog.create({
      data: {
        action: "create",
        entityType: "reminder",
        entityId: reminder.id,
        details: JSON.stringify({ recordNumber, text: text.slice(0, 100), mode }),
        userId: auth.userId,
      },
    })

    return NextResponse.json({ reminder }, { status: 201 })
  } catch (error) {
    console.error("Create reminder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
