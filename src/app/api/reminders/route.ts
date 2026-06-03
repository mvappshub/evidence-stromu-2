import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { calculateNextDueAt } from "@/lib/reminder-utils"
import { parseInputDate } from "@/lib/server-date"

const createReminderSchema = z.object({
  recordNumber: z.number().int("Record number is required"),
  text: z.string().min(1, "Reminder text is required"),
  mode: z.enum(["interval", "date"]),
  intervalNum: z.number().int().positive().optional(),
  intervalUnit: z.enum(["day", "week", "month", "year"]).optional(),
  startAt: z.string().optional(),
  dueAt: z.string().optional(),
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

    const { recordNumber, text, mode, intervalNum, intervalUnit, startAt, dueAt } = parsed.data

    // Validate mode-specific fields
    if (mode === "interval" && (!intervalNum || !intervalUnit)) {
      return NextResponse.json(
        { error: "Interval mode requires intervalNum and intervalUnit" },
        { status: 400 }
      )
    }
    if (mode === "date" && !dueAt) {
      return NextResponse.json(
        { error: "Date mode requires dueAt" },
        { status: 400 }
      )
    }

    const parsedStartAt = startAt ? parseInputDate(startAt) : null
    if (startAt && !parsedStartAt) {
      return NextResponse.json({ error: "Invalid startAt date" }, { status: 400 })
    }

    const parsedDueAt = dueAt ? parseInputDate(dueAt) : null
    if (dueAt && !parsedDueAt) {
      return NextResponse.json({ error: "Invalid dueAt date" }, { status: 400 })
    }

    // Verify the record belongs to the user
    const record = await db.treeRecord.findFirst({
      where: { recordNumber, createdById: auth.userId },
    })
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    const nextDueAt = calculateNextDueAt(
      mode,
      parsedStartAt,
      intervalNum ?? null,
      intervalUnit ?? null,
      parsedDueAt
    )

    const reminder = await db.reminder.create({
      data: {
        text,
        mode,
        intervalNum: intervalNum ?? null,
        intervalUnit: intervalUnit ?? null,
        startAt: parsedStartAt,
        dueAt: parsedDueAt,
        nextDueAt,
        recordNumber,
      },
    })

    // Log activity
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
