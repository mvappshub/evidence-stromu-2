import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { deletePhotoFile } from "@/lib/photo-storage"

const bulkDeleteSchema = z.object({
  recordNumbers: z.array(z.number().int().positive()).min(1),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const parsed = bulkDeleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { recordNumbers } = parsed.data

    const toDelete = await db.treeRecord.findMany({
      where: {
        recordNumber: { in: recordNumbers },
        createdById: auth.userId,
      },
      select: { recordNumber: true, photoPath: true, speciesLatin: true },
    })

    if (toDelete.length === 0) {
      return NextResponse.json({ deleted: 0 })
    }

    await db.treeRecord.deleteMany({
      where: {
        recordNumber: { in: toDelete.map((r) => r.recordNumber) },
        createdById: auth.userId,
      },
    })

    await Promise.all(toDelete.map((r) => deletePhotoFile(r.photoPath)))

    await db.activityLog.create({
      data: {
        action: "delete",
        entityType: "record",
        entityId: "bulk",
        details: JSON.stringify({
          bulk: true,
          count: toDelete.length,
          recordNumbers: toDelete.map((r) => r.recordNumber),
        }),
        userId: auth.userId,
      },
    })

    return NextResponse.json({ deleted: toDelete.length })
  } catch (error) {
    console.error("Bulk delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
