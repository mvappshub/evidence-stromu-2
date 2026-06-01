import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)
  const entityType = searchParams.get("entityType") || undefined
  const action = searchParams.get("action") || undefined

  // Build where clause with optional filters
  const where: Record<string, unknown> = { userId: auth.userId }
  if (entityType) where.entityType = entityType
  if (action) where.action = action

  const activities = await db.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  })

  // Enrich record entries with species/locality info
  const recordNumbers = activities
    .filter((a) => a.entityType === "record")
    .map((a) => parseInt(a.entityId, 10))
    .filter((n) => !isNaN(n))

  const uniqueRecordNumbers = [...new Set(recordNumbers)]

  let recordMap: Map<number, { speciesLatin: string; locality: string | null }> = new Map()
  if (uniqueRecordNumbers.length > 0) {
    const records = await db.treeRecord.findMany({
      where: {
        recordNumber: { in: uniqueRecordNumbers },
      },
      select: {
        recordNumber: true,
        speciesLatin: true,
        locality: true,
      },
    })
    recordMap = new Map(records.map((r) => [r.recordNumber, { speciesLatin: r.speciesLatin, locality: r.locality }]))
  }

  return NextResponse.json({
    activities: activities.map((a) => {
      const result: Record<string, unknown> = {
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        details: a.details,
        createdAt: a.createdAt.toISOString(),
        userName: a.user.name || a.user.email?.split("@")[0] || "",
      }

      // Add record info for record entities
      if (a.entityType === "record") {
        const rn = parseInt(a.entityId, 10)
        if (!isNaN(rn)) {
          const recordInfo = recordMap.get(rn)
          result.recordSpecies = recordInfo?.speciesLatin ?? null
          result.recordLocality = recordInfo?.locality ?? null
        }
      }

      return result
    }),
  })
}
