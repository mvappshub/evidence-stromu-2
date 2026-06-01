import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") ?? "csv"
  const species = searchParams.get("species")
  const locality = searchParams.get("locality")
  const search = searchParams.get("search")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")

  // Build the same filter as the records GET endpoint
  const where: Record<string, unknown> = {
    createdById: auth.userId,
  }

  if (species) {
    where.speciesLatin = { contains: species }
  }
  if (locality) {
    where.locality = { contains: locality }
  }
  if (search) {
    where.OR = [
      { speciesLatin: { contains: search } },
      { locality: { contains: search } },
      { note: { contains: search } },
    ]
  }

  // Date range filter on plantedAt
  if (dateFrom || dateTo) {
    const plantedAtFilter: Record<string, unknown> = {}
    if (dateFrom) plantedAtFilter.gte = new Date(dateFrom)
    if (dateTo) plantedAtFilter.lte = new Date(dateTo)
    where.plantedAt = plantedAtFilter
  }

  const records = await db.treeRecord.findMany({
    where,
    orderBy: { recordNumber: "asc" },
  })

  if (format === "geojson") {
    const featureCollection = {
      type: "FeatureCollection" as const,
      features: records.map((r) => ({
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
          note: r.note,
        },
      })),
    }

    return new NextResponse(JSON.stringify(featureCollection, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/geo+json; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="stromy.geojson"',
      },
    })
  }

  // CSV export (default)
  const BOM = "\uFEFF"
  const delimiter = ";"
  const headers = [
    "Číslo",
    "Druh",
    "Datum výsadby",
    "Zem. šířka",
    "Zem. délka",
    "Lokalita",
    "Poznámka",
  ]

  const escapeCsvField = (value: string | null | number): string => {
    const str = String(value ?? "")
    // If the field contains delimiter, quote, or newline, wrap in quotes
    if (str.includes(delimiter) || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = records.map((r) =>
    [
      escapeCsvField(r.recordNumber),
      escapeCsvField(r.speciesLatin),
      escapeCsvField(r.plantedAt ? new Date(r.plantedAt).toISOString().slice(0, 10) : ""),
      escapeCsvField(r.lat),
      escapeCsvField(r.lng),
      escapeCsvField(r.locality),
      escapeCsvField(r.note),
    ].join(delimiter),
  )

  const csv = BOM + [headers.join(delimiter), ...rows].join("\r\n")

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="stromy.csv"',
    },
  })
}
