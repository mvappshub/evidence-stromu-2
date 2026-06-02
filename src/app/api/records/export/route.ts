import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { buildRecordsWhere, parseRecordsFilterParams } from "@/lib/records-query"

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") ?? "csv"
  const filters = parseRecordsFilterParams(searchParams)
  const where = buildRecordsWhere(auth.userId, filters)

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
