import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { calculateNextDueAt } from "@/lib/reminder-utils"

const bulkReminderSchema = z.object({
  recordNumbers: z.array(z.number().int()).min(1, "At least one record number is required"),
  text: z.string().min(1, "Reminder text is required"),
  mode: z.enum(["interval", "date"]),
  intervalNum: z.number().int().positive().optional(),
  intervalUnit: z.enum(["day", "week", "month", "year"]).optional(),
  startAt: z.string().optional(),
  dueAt: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
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

    const { recordNumbers, text, mode, intervalNum, intervalUnit, startAt, dueAt } = parsed.data

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

    // Verify all records belong to the user
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

    const nextDueAt = calculateNextDueAt(
      mode,
      startAt ? new Date(startAt) : null,
      intervalNum ?? null,
      intervalUnit ?? null,
      dueAt ? new Date(dueAt) : null
    )

    const remindersData = ownedNumbers.map((recordNumber) => ({
      text,
      mode,
      intervalNum: intervalNum ?? null,
      intervalUnit: intervalUnit ?? null,
      startAt: startAt ? new Date(startAt) : null,
      dueAt: dueAt ? new Date(dueAt) : null,
      nextDueAt,
      recordNumber,
    }))

    const result = await db.reminder.createMany({ data: remindersData })

    return NextResponse.json({
      message: `Created ${result.count} reminder(s)`,
      createdCount: result.count,
    }, { status: 201 })
  } catch (error) {
    console.error("Bulk reminder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
