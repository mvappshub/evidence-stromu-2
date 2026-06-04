import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { getOwnedRecordNumbers } from "@/lib/assert-records-owned"
import { buildReminderCreateData, reminderInputFieldsSchema } from "@/lib/reminder-input"
import { validateReminderForCreate } from "@/lib/reminder-create-validation"

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

    const { recordNumbers, ...reminderInput } = parsed.data

    const validated = validateReminderForCreate(reminderInput)
    if (!validated.ok) return validated.response
    const { fields, dates } = validated

    const owned = await getOwnedRecordNumbers(auth.userId, recordNumbers)
    if (!owned.ok) return owned.response
    const { ownedNumbers } = owned

    const remindersData = ownedNumbers.map((recordNumber) =>
      buildReminderCreateData(fields, dates, recordNumber)
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
          text: fields.text.slice(0, 100),
          mode: fields.mode,
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
