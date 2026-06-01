import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)

  const activities = await db.activityLog.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  })

  return NextResponse.json({
    activities: activities.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      details: a.details,
      createdAt: a.createdAt.toISOString(),
      userName: a.user.name || a.user.email?.split("@")[0] || "",
    })),
  })
}
