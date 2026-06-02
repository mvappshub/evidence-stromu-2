import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  const userWhere = { createdById: auth.userId }

  const [
    totalCount,
    speciesBreakdown,
    dateRange,
    localityBreakdown,
    plantedAtRows,
    speciesCount,
    localityCount,
  ] = await Promise.all([
    db.treeRecord.count({ where: userWhere }),
    db.treeRecord.groupBy({
      by: ["speciesLatin"],
      where: userWhere,
      _count: { speciesLatin: true },
      orderBy: { _count: { speciesLatin: "desc" } },
    }),
    db.treeRecord.aggregate({
      where: userWhere,
      _min: { plantedAt: true },
      _max: { plantedAt: true },
    }),
    db.treeRecord.groupBy({
      by: ["locality"],
      where: { ...userWhere, locality: { not: null } },
      _count: { locality: true },
      orderBy: { _count: { locality: "desc" } },
      take: 10,
    }),
    db.treeRecord.findMany({
      where: userWhere,
      select: { plantedAt: true },
      orderBy: { plantedAt: "asc" },
    }),
    db.treeRecord
      .groupBy({
        by: ["speciesLatin"],
        where: userWhere,
        _count: { _all: true },
      })
      .then((r) => r.length),
    db.treeRecord
      .groupBy({
        by: ["locality"],
        where: {
          ...userWhere,
          AND: [{ locality: { not: null } }, { locality: { not: "" } }],
        },
        _count: { _all: true },
      })
      .then((r) => r.length),
  ])

  const yearlyMap = new Map<string, number>()
  for (const row of plantedAtRows) {
    const year = row.plantedAt.getUTCFullYear()
    if (Number.isNaN(year)) continue
    const key = String(year)
    yearlyMap.set(key, (yearlyMap.get(key) ?? 0) + 1)
  }

  const yearlyBreakdown = Array.from(yearlyMap.entries()).map(([year, count]) => ({
    year,
    count,
  }))

  return NextResponse.json({
    totalCount,
    speciesCount,
    localityCount,
    lastPlantedAt: dateRange._max.plantedAt,
    speciesBreakdown: speciesBreakdown.map((s) => ({
      species: s.speciesLatin,
      count: s._count.speciesLatin,
    })),
    dateRange: {
      earliest: dateRange._min.plantedAt,
      latest: dateRange._max.plantedAt,
    },
    localityBreakdown: localityBreakdown.map((l) => ({
      locality: l.locality,
      count: l._count.locality,
    })),
    yearlyBreakdown,
  })
}
