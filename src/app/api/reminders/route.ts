import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { buildReminderCreateData, reminderInputFieldsSchema } from "@/lib/reminder-input"
import { validateReminderForCreate } from "@/lib/reminder-create-validation"

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

    const { recordNumber, ...reminderInput } = parsed.data

    const validated = validateReminderForCreate(reminderInput)
    if (!validated.ok) return validated.response
    const { fields, dates } = validated

    const record = await db.treeRecord.findFirst({
      where: { recordNumber, createdById: auth.userId },
    })
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    const reminder = await db.reminder.create({
      data: buildReminderCreateData(fields, dates, recordNumber),
    })


    return NextResponse.json({ reminder }, { status: 201 })
  } catch (error) {
    console.error("Create reminder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
