import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { enrichRecordLocationFromCoords } from "@/lib/records/enrich-record-location"
import { parseInputDate } from "@/lib/server-date"
import { MAX_LINE_PLACE_POINTS } from "@/lib/geodesic-line-points"

const recordInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speciesLatin: z.string().min(1),
  plantedAt: z.string().min(1),
  locality: z.string().nullable().optional(),
})

const bulkCreateSchema = z.object({
  records: z.array(recordInputSchema).min(1).max(MAX_LINE_PLACE_POINTS),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const parsed = bulkCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const created: number[] = []
    const errors: string[] = []

    for (let i = 0; i < parsed.data.records.length; i++) {
      const row = parsed.data.records[i]!
      const plantedAtDate = parseInputDate(row.plantedAt)
      if (!plantedAtDate) {
        errors.push(`Řádek ${i + 1}: neplatné datum výsadby`)
        continue
      }

      try {
        const enriched = await enrichRecordLocationFromCoords(row.lng, row.lat, {
          fillLocality: !row.locality,
        })

        const record = await db.treeRecord.create({
          data: {
            lat: row.lat,
            lng: row.lng,
            speciesLatin: row.speciesLatin,
            plantedAt: plantedAtDate,
            locality: row.locality || enriched.locality || null,
            orpKod: enriched.orpKod ?? null,
            createdById: auth.userId,
          },
        })
        created.push(record.recordNumber)
      } catch {
        errors.push(`Řádek ${i + 1}: uložení se nezdařilo`)
      }
    }

    if (created.length === 0) {
      return NextResponse.json(
        { error: "Žádný záznam se nepodařilo vytvořit", errors },
        { status: 400 }
      )
    }

    return NextResponse.json({
      createdCount: created.length,
      recordNumbers: created,
      errors,
    })
  } catch (error) {
    console.error("Bulk create records error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
