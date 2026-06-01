import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { advanceIntervalReminder } from "@/lib/reminder-utils"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(_request)
  if ("error" in auth) return auth.error

  try {
    const { id } = await params

    const reminder = await db.reminder.findFirst({
      where: { id, record: { createdById: auth.userId } },
    })

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    }

    if (!reminder.active) {
      return NextResponse.json({ error: "Reminder is already inactive" }, { status: 400 })
    }

    // Log activity before advancing/completing
    await db.activityLog.create({
      data: {
        action: "ack",
        entityType: "reminder",
        entityId: id,
        details: JSON.stringify({ recordNumber: reminder.recordNumber, text: reminder.text.slice(0, 100) }),
        userId: auth.userId,
      },
    })

    if (reminder.mode === "interval") {
      // Advance to next interval
      if (!reminder.intervalNum || !reminder.intervalUnit) {
        return NextResponse.json(
          { error: "Invalid interval reminder: missing intervalNum or intervalUnit" },
          { status: 400 }
        )
      }

      const nextDueAt = advanceIntervalReminder(
        reminder.nextDueAt,
        reminder.intervalNum,
        reminder.intervalUnit as "day" | "week" | "month" | "year"
      )

      const updated = await db.reminder.update({
        where: { id },
        data: { nextDueAt },
      })

      return NextResponse.json({ reminder: updated, action: "advanced" })
    } else {
      // Date mode: mark as completed (inactive)
      const updated = await db.reminder.update({
        where: { id },
        data: { active: false },
      })

      return NextResponse.json({ reminder: updated, action: "completed" })
    }
  } catch (error) {
    console.error("Acknowledge reminder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
