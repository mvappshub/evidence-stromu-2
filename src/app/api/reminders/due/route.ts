import { NextRequest, NextResponse } from "next/server"
import { addDays } from "date-fns"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const horizon = parseInt(searchParams.get("horizon") || "14", 10)
  const cutoff = addDays(new Date(), horizon)

  const reminders = await db.reminder.findMany({
    where: {
      active: true,
      nextDueAt: { lte: cutoff },
      record: { createdById: auth.userId },
    },
    include: {
      record: {
        select: {
          recordNumber: true,
          speciesLatin: true,
        },
      },
    },
    orderBy: { nextDueAt: "asc" },
  })

  return NextResponse.json({ reminders })
}
