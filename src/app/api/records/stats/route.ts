import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  const [totalCount, speciesBreakdown, dateRange, localityBreakdown, yearCounts] = await Promise.all([
    db.treeRecord.count({ where: { createdById: auth.userId } }),
    db.treeRecord.groupBy({
      by: ['speciesLatin'],
      where: { createdById: auth.userId },
      _count: { speciesLatin: true },
      orderBy: { _count: { speciesLatin: 'desc' } },
    }),
    db.treeRecord.aggregate({
      where: { createdById: auth.userId },
      _min: { plantedAt: true },
      _max: { plantedAt: true },
    }),
    db.treeRecord.groupBy({
      by: ['locality'],
      where: { createdById: auth.userId, locality: { not: null } },
      _count: { locality: true },
      orderBy: { _count: { locality: 'desc' } },
      take: 10,
    }),
    db.treeRecord.findMany({
      where: { createdById: auth.userId },
      select: { plantedAt: true },
    }),
  ])

  // Build yearly breakdown from plantedAt dates
  const yearlyBreakdownMap: Record<string, number> = {}
  yearCounts.forEach(r => {
    const year = new Date(r.plantedAt).getFullYear().toString()
    yearlyBreakdownMap[year] = (yearlyBreakdownMap[year] || 0) + 1
  })

  return NextResponse.json({
    totalCount,
    speciesBreakdown: speciesBreakdown.map(s => ({
      species: s.speciesLatin,
      count: s._count.speciesLatin,
    })),
    dateRange: {
      earliest: dateRange._min.plantedAt,
      latest: dateRange._max.plantedAt,
    },
    localityBreakdown: localityBreakdown.map(l => ({
      locality: l.locality,
      count: l._count.locality,
    })),
    yearlyBreakdown: Object.entries(yearlyBreakdownMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, count]) => ({ year, count })),
  })
}
