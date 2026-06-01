import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ species: string }> }
) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  try {
    const { species } = await params
    const decodedSpecies = decodeURIComponent(species)

    // Get species-specific stats
    const records = await db.treeRecord.findMany({
      where: {
        speciesLatin: decodedSpecies,
        createdById: auth.userId,
      },
      select: {
        plantedAt: true,
        locality: true,
        recordNumber: true,
      },
      orderBy: { plantedAt: "asc" },
    })

    if (records.length === 0) {
      return NextResponse.json({
        species: decodedSpecies,
        count: 0,
        dateRange: null,
        localities: [],
        recordNumbers: [],
      })
    }

    const dates = records.map((r) => new Date(r.plantedAt))
    const earliest = dates[0]
    const latest = dates[dates.length - 1]

    // Count unique localities
    const localityMap = new Map<string, number>()
    for (const r of records) {
      const loc = r.locality || "Neznámá lokalita"
      localityMap.set(loc, (localityMap.get(loc) || 0) + 1)
    }
    const localities = Array.from(localityMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      species: decodedSpecies,
      count: records.length,
      dateRange: {
        earliest: earliest.toISOString(),
        latest: latest.toISOString(),
      },
      localities,
      recordNumbers: records.map((r) => r.recordNumber),
    })
  } catch (error) {
    console.error("Species stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
