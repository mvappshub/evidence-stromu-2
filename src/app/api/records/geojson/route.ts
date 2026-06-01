import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  const records = await db.treeRecord.findMany({
    where: { createdById: auth.userId },
    select: {
      recordNumber: true,
      speciesLatin: true,
      plantedAt: true,
      locality: true,
      lat: true,
      lng: true,
    },
  })

  const features = records.map((r) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [r.lng, r.lat],
    },
    properties: {
      recordNumber: r.recordNumber,
      speciesLatin: r.speciesLatin,
      plantedAt: r.plantedAt,
      locality: r.locality,
    },
  }))

  return NextResponse.json({
    type: "FeatureCollection",
    features,
  })
}
