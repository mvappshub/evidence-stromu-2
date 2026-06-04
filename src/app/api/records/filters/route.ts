import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { buildRecordsWhere, parseRecordsFilterParams } from "@/lib/records-query"

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const filters = parseRecordsFilterParams(searchParams)
  const baseWhere = buildRecordsWhere(auth.userId, filters)

  const [catalogSpecies, speciesRaw, localityRaw] = await Promise.all([
    db.species.findMany({
      select: { latinName: true },
      orderBy: { latinName: "asc" },
    }),
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

  const species = [
    ...new Set([
      ...catalogSpecies.map((s) => s.latinName),
      ...speciesRaw.map((r) => r.speciesLatin),
    ]),
  ].sort()
  const localities = localityRaw
    .map((r) => r.locality!)
    .sort()

  return NextResponse.json({ species, localities })
}
