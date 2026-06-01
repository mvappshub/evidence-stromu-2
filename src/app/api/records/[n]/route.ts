import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

const updateRecordSchema = z.object({
  speciesLatin: z.string().min(1).optional(),
  plantedAt: z.string().min(1).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  locality: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  photoPath: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ n: string }> }
) {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  try {
    const { n } = await params
    const recordNumber = parseInt(n, 10)
    if (isNaN(recordNumber)) {
      return NextResponse.json({ error: "Invalid record number" }, { status: 400 })
    }

    const existing = await db.treeRecord.findFirst({
      where: { recordNumber, createdById: auth.userId },
    })
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateRecordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    const update = parsed.data

    if (update.speciesLatin !== undefined) data.speciesLatin = update.speciesLatin
    if (update.plantedAt !== undefined) data.plantedAt = new Date(update.plantedAt)
    if (update.lat !== undefined) data.lat = update.lat
    if (update.lng !== undefined) data.lng = update.lng
    if (update.locality !== undefined) data.locality = update.locality
    if (update.note !== undefined) data.note = update.note
    if (update.photoPath !== undefined) data.photoPath = update.photoPath

    const record = await db.treeRecord.update({
      where: { recordNumber },
      data,
    })

    return NextResponse.json({ record })
  } catch (error) {
    console.error("Update record error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ n: string }> }
) {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  try {
    const { n } = await params
    const recordNumber = parseInt(n, 10)
    if (isNaN(recordNumber)) {
      return NextResponse.json({ error: "Invalid record number" }, { status: 400 })
    }

    const existing = await db.treeRecord.findFirst({
      where: { recordNumber, createdById: auth.userId },
    })
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    // Cascade delete reminders via Prisma schema onDelete: Cascade
    await db.treeRecord.delete({ where: { recordNumber } })

    return NextResponse.json({ message: "Record deleted successfully" })
  } catch (error) {
    console.error("Delete record error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
