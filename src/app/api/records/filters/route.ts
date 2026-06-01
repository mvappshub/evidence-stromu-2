import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")

  const baseWhere: Record<string, unknown> = {
    createdById: auth.userId,
  }

  // Date range filter on plantedAt
  if (dateFrom || dateTo) {
    const plantedAtFilter: Record<string, unknown> = {}
    if (dateFrom) plantedAtFilter.gte = new Date(dateFrom)
    if (dateTo) plantedAtFilter.lte = new Date(dateTo)
    baseWhere.plantedAt = plantedAtFilter
  }

  const [speciesRaw, localityRaw] = await Promise.all([
    db.treeRecord.findMany({
      where: baseWhere,
      select: { speciesLatin: true },
      distinct: ["speciesLatin"],
    }),
    db.treeRecord.findMany({
      where: {
        ...baseWhere,
        locality: { not: null },
      },
      select: { locality: true },
      distinct: ["locality"],
    }),
  ])

  const species = speciesRaw.map((r) => r.speciesLatin).sort()
  const localities = localityRaw
    .map((r) => r.locality!)
    .sort()

  return NextResponse.json({ species, localities })
}
