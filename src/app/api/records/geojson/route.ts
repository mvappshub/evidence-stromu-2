import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { buildRecordsWhere, parseRecordsFilterParams } from "@/lib/records-query"
import { treeMapFeatureFromRecord } from "@/lib/tree-map-geojson"

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const filters = parseRecordsFilterParams(searchParams)
  const where = buildRecordsWhere(auth.userId, filters)

  const records = await db.treeRecord.findMany({
    where,
    select: {
      recordNumber: true,
      speciesLatin: true,
      plantedAt: true,
      locality: true,
      lat: true,
      lng: true,
    },
  })

  const features = records.map((r) => treeMapFeatureFromRecord(r))

  return NextResponse.json({
    type: "FeatureCollection",
    features,
  })
}
