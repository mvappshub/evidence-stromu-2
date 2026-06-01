import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  const [totalCount, speciesBreakdown, dateRange, localityBreakdown] = await Promise.all([
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
  ])

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
  })
}
