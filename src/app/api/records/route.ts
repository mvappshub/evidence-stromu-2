import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { buildRecordsWhere, parseRecordsFilterParams } from "@/lib/records-query"
import { enrichRecordLocationFromCoords } from "@/lib/records/enrich-record-location"
import { parseInputDate } from "@/lib/server-date"

const createRecordSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speciesLatin: z.string().min(1, "Zadejte druh (latinsky)"),
  plantedAt: z.string().min(1, "Zadejte datum výsadby"),
  locality: z.string().nullable().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const filters = parseRecordsFilterParams(searchParams)
  const where = buildRecordsWhere(auth.userId, filters)
  const sort = searchParams.get("sort") || "createdAt"
  const order = searchParams.get("order") || "desc"
  const parsedLimit = parseInt(searchParams.get("limit") || "50", 10)
  const parsedOffset = parseInt(searchParams.get("offset") || "0", 10)
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 50
  const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0

  const allowedSortFields = ["createdAt", "plantedAt", "speciesLatin", "recordNumber"]
  const sortField = allowedSortFields.includes(sort) ? sort : "createdAt"
  const sortOrder = order === "asc" ? "asc" : "desc"

  const [records, count] = await Promise.all([
    db.treeRecord.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      take: limit,
      skip: offset,
      include: { reminders: true },
    }),
    db.treeRecord.count({ where }),
  ])

  return NextResponse.json({ records, count, limit, offset })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const parsed = createRecordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { lat, lng, speciesLatin, plantedAt, locality } = parsed.data
    const plantedAtDate = parseInputDate(plantedAt)
    if (!plantedAtDate) {
      return NextResponse.json(
        { error: "Validation failed", details: [{ path: ["plantedAt"], message: "Invalid plantedAt date" }] },
        { status: 400 }
      )
    }

    const enriched = await enrichRecordLocationFromCoords(lng, lat, {
      fillLocality: !locality,
    })

    const record = await db.treeRecord.create({
      data: {
        lat,
        lng,
        speciesLatin,
        plantedAt: plantedAtDate,
        locality: locality || enriched.locality || null,
        orpKod: enriched.orpKod ?? null,
        createdById: auth.userId,
      },
    })

    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    console.error("Create record error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
