import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { calculateNextDueAt } from "@/lib/reminder-utils"
import { parseInputDate } from "@/lib/server-date"

const updateReminderSchema = z.object({
  text: z.string().min(1).optional(),
  mode: z.enum(["interval", "date"]).optional(),
  intervalNum: z.number().int().positive().optional().nullable(),
  intervalUnit: z.enum(["day", "week", "month", "year"]).optional().nullable(),
  startAt: z.string().optional().nullable(),
  dueAt: z.string().optional().nullable(),
  active: z.boolean().optional(),
})

type PatchReminderInput = z.infer<typeof updateReminderSchema>

type ExistingReminder = NonNullable<Awaited<ReturnType<typeof getReminderForUser>>>

type ParsedPatchDates = {
  parsedStartAt: Date | null | undefined
  parsedDueAt: Date | null | undefined
}

async function getReminderForUser(id: string, userId: string) {
  return db.reminder.findFirst({
    where: { id, record: { createdById: userId } },
  })
}

function parsePatchReminderBody(body: unknown) {
  const parsed = updateReminderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    )
  }
  return { update: parsed.data }
}

function parseNullableReminderDate(value: string | null | undefined) {
  if (value !== undefined && value !== null) {
    return parseInputDate(value)
  }
  if (value === null) {
    return null
  }
  return undefined
}

function validatePatchReminderDates(update: PatchReminderInput) {
  const parsedStartAt = parseNullableReminderDate(update.startAt)
  if (update.startAt !== undefined && update.startAt !== null && !parsedStartAt) {
    return NextResponse.json({ error: "Invalid startAt date" }, { status: 400 })
  }

  const parsedDueAt = parseNullableReminderDate(update.dueAt)
  if (update.dueAt !== undefined && update.dueAt !== null && !parsedDueAt) {
    return NextResponse.json({ error: "Invalid dueAt date" }, { status: 400 })
  }

  return { parsedStartAt, parsedDueAt }
}

function shouldRecalculateNextDueAt(update: PatchReminderInput) {
  return (
    update.mode !== undefined ||
    update.intervalNum !== undefined ||
    update.intervalUnit !== undefined ||
    update.startAt !== undefined ||
    update.dueAt !== undefined
  )
}

function buildReminderPatchData(
  update: PatchReminderInput,
  dates: ParsedPatchDates,
  existing: ExistingReminder
) {
  const { parsedStartAt, parsedDueAt } = dates
  const data: Record<string, unknown> = {}

  if (update.text !== undefined) data.text = update.text
  if (update.mode !== undefined) data.mode = update.mode
  if (update.intervalNum !== undefined) data.intervalNum = update.intervalNum
  if (update.intervalUnit !== undefined) data.intervalUnit = update.intervalUnit
  if (update.startAt !== undefined) data.startAt = parsedStartAt ?? null
  if (update.dueAt !== undefined) data.dueAt = parsedDueAt ?? null
  if (update.active !== undefined) data.active = update.active

  if (shouldRecalculateNextDueAt(update)) {
    const mode =
      (update.mode as "interval" | "date") ?? (existing.mode as "interval" | "date")
    const intervalNum =
      update.intervalNum !== undefined ? update.intervalNum : existing.intervalNum
    const intervalUnit =
      update.intervalUnit !== undefined
        ? (update.intervalUnit as "day" | "week" | "month" | "year")
        : (existing.intervalUnit as "day" | "week" | "month" | "year")
    const startAtValue =
      update.startAt !== undefined ? (parsedStartAt ?? null) : existing.startAt
    const dueAtValue = update.dueAt !== undefined ? (parsedDueAt ?? null) : existing.dueAt

    data.nextDueAt = calculateNextDueAt(
      mode,
      startAtValue,
      intervalNum,
      intervalUnit,
      dueAtValue
    )
  }

  return data
}

async function logReminderUpdate(
  id: string,
  userId: string,
  recordNumber: number,
  changedFields: string[]
) {
  await db.activityLog.create({
    data: {
      action: "update",
      entityType: "reminder",
      entityId: id,
      details: JSON.stringify({ recordNumber, changedFields }),
      userId,
    },
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
    const parsed = parsePatchReminderBody(body)
    if (parsed instanceof NextResponse) return parsed

    const dates = validatePatchReminderDates(parsed.update)
    if (dates instanceof NextResponse) return dates

    const data = buildReminderPatchData(parsed.update, dates, existing)
    const reminder = await db.reminder.update({
      where: { id },
      data,
    })

    await logReminderUpdate(id, auth.userId, existing.recordNumber, Object.keys(data))

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
        details: JSON.stringify({
          recordNumber: existing.recordNumber,
          text: existing.text.slice(0, 100),
        }),
        userId: auth.userId,
      },
    })

    return NextResponse.json({ message: "Reminder deleted successfully" })
  } catch (error) {
    console.error("Delete reminder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
