import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

const createRecordSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speciesLatin: z.string().min(1, "Species name is required"),
  plantedAt: z.string().min(1, "Planting date is required"),
  locality: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const species = searchParams.get("species")
  const locality = searchParams.get("locality")
  const search = searchParams.get("search")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const sort = searchParams.get("sort") || "createdAt"
  const order = searchParams.get("order") || "desc"
  const limit = parseInt(searchParams.get("limit") || "50", 10)
  const offset = parseInt(searchParams.get("offset") || "0", 10)

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
  const auth = await requireAuth()
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

    const record = await db.treeRecord.create({
      data: {
        lat,
        lng,
        speciesLatin,
        plantedAt: new Date(plantedAt),
        locality: locality || null,
        createdById: auth.userId,
      },
    })

    // Log activity
    await db.activityLog.create({
      data: {
        action: "create",
        entityType: "record",
        entityId: String(record.recordNumber),
        details: JSON.stringify({ speciesLatin, recordNumber: record.recordNumber }),
        userId: auth.userId,
      },
    })

    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    console.error("Create record error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
