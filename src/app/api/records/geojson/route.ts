import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const species = searchParams.get("species")

  const where: Record<string, unknown> = {
    createdById: auth.userId,
  }

  if (species) {
    where.speciesLatin = species
  }

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
