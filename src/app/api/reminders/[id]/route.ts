import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { calculateNextDueAt } from "@/lib/reminder-utils"

const updateReminderSchema = z.object({
  text: z.string().min(1).optional(),
  mode: z.enum(["interval", "date"]).optional(),
  intervalNum: z.number().int().positive().optional().nullable(),
  intervalUnit: z.enum(["day", "week", "month", "year"]).optional().nullable(),
  startAt: z.string().optional().nullable(),
  dueAt: z.string().optional().nullable(),
  active: z.boolean().optional(),
})

async function getReminderForUser(id: string, userId: string) {
  return db.reminder.findFirst({
    where: { id, record: { createdById: userId } },
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  try {
    const { id } = await params
    const existing = await getReminderForUser(id, auth.userId)
    if (!existing) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateReminderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const update = parsed.data
    const data: Record<string, unknown> = {}

    if (update.text !== undefined) data.text = update.text
    if (update.mode !== undefined) data.mode = update.mode
    if (update.intervalNum !== undefined) data.intervalNum = update.intervalNum
    if (update.intervalUnit !== undefined) data.intervalUnit = update.intervalUnit
    if (update.startAt !== undefined) data.startAt = update.startAt ? new Date(update.startAt) : null
    if (update.dueAt !== undefined) data.dueAt = update.dueAt ? new Date(update.dueAt) : null
    if (update.active !== undefined) data.active = update.active

    // Determine if we need to recalculate nextDueAt
    const needsRecalc =
      update.mode !== undefined ||
      update.intervalNum !== undefined ||
      update.intervalUnit !== undefined ||
      update.startAt !== undefined ||
      update.dueAt !== undefined

    if (needsRecalc) {
      const mode = (update.mode as "interval" | "date") ?? (existing.mode as "interval" | "date")
      const intervalNum = update.intervalNum !== undefined ? update.intervalNum : existing.intervalNum
      const intervalUnit = update.intervalUnit !== undefined ? update.intervalUnit as "day" | "week" | "month" | "year" : existing.intervalUnit as "day" | "week" | "month" | "year"
      const startAtValue = update.startAt !== undefined
        ? (update.startAt ? new Date(update.startAt) : null)
        : existing.startAt
      const dueAtValue = update.dueAt !== undefined
        ? (update.dueAt ? new Date(update.dueAt) : null)
        : existing.dueAt

      data.nextDueAt = calculateNextDueAt(mode, startAtValue, intervalNum, intervalUnit, dueAtValue)
    }

    const reminder = await db.reminder.update({
      where: { id },
      data,
    })

    // Log activity
    const changedFields = Object.keys(data)
    await db.activityLog.create({
      data: {
        action: "update",
        entityType: "reminder",
        entityId: id,
        details: JSON.stringify({ recordNumber: existing.recordNumber, changedFields }),
        userId: auth.userId,
      },
    })

    return NextResponse.json({ reminder })
  } catch (error) {
    console.error("Update reminder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(_request)
  if ("error" in auth) return auth.error

  try {
    const { id } = await params
    const existing = await getReminderForUser(id, auth.userId)
    if (!existing) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    }

    await db.reminder.delete({ where: { id } })

    // Log activity
    await db.activityLog.create({
      data: {
        action: "delete",
        entityType: "reminder",
        entityId: id,
        details: JSON.stringify({ recordNumber: existing.recordNumber, text: existing.text.slice(0, 100) }),
        userId: auth.userId,
      },
    })

    return NextResponse.json({ message: "Reminder deleted successfully" })
  } catch (error) {
    console.error("Delete reminder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
