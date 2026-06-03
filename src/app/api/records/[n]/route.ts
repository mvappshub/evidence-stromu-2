import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { deletePhotoFile } from "@/lib/photo-storage"
import { updateTreeRecord } from "@/lib/records/update-tree-record"

const updateRecordSchema = z.object({
  speciesLatin: z.string().min(1).optional(),
  plantedAt: z.string().min(1).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  locality: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  photoPath: z.string().nullable().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ n: string }> }
) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  try {
    const { n } = await params
    const recordNumber = parseInt(n, 10)
    if (isNaN(recordNumber)) {
      return NextResponse.json({ error: "Invalid record number" }, { status: 400 })
    }

    const record = await db.treeRecord.findFirst({
      where: { recordNumber, createdById: auth.userId },
      include: { reminders: true },
    })
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    return NextResponse.json({ record })
  } catch (error) {
    console.error("Get record error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ n: string }> }
) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  try {
    const { n } = await params
    const recordNumber = parseInt(n, 10)
    if (isNaN(recordNumber)) {
      return NextResponse.json({ error: "Invalid record number" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = updateRecordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const result = await updateTreeRecord(
      db,
      auth.userId,
      recordNumber,
      parsed.data
    )
    if (!result.ok) {
      const status = result.code === "not_found" ? 404 : 400
      return NextResponse.json({ error: result.message }, { status })
    }

    return NextResponse.json({ record: result.record })
  } catch (error) {
    console.error("Update record error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ n: string }> }
) {
  const auth = await requireAuth(_request)
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

    await deletePhotoFile(existing.photoPath)

    // Cascade delete reminders via Prisma schema onDelete: Cascade
    await db.treeRecord.delete({ where: { recordNumber } })

    // Log activity
    await db.activityLog.create({
      data: {
        action: "delete",
        entityType: "record",
        entityId: String(recordNumber),
        details: JSON.stringify({ recordNumber, speciesLatin: existing.speciesLatin }),
        userId: auth.userId,
      },
    })

    return NextResponse.json({ message: "Record deleted successfully" })
  } catch (error) {
    console.error("Delete record error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
