import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

const bulkEditSchema = z.object({
  recordNumbers: z.array(z.number()).min(1),
  speciesLatin: z.string().optional(),
  locality: z.string().nullable().optional(),
  plantedAt: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const parsed = bulkEditSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { recordNumbers, speciesLatin, locality, plantedAt } = parsed.data

    // Build update data - only include fields that were provided
    const updateData: Record<string, unknown> = {}
    if (speciesLatin !== undefined) updateData.speciesLatin = speciesLatin
    if (locality !== undefined) updateData.locality = locality || null
    if (plantedAt !== undefined) updateData.plantedAt = new Date(plantedAt)

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const result = await db.treeRecord.updateMany({
      where: {
        recordNumber: { in: recordNumbers },
        createdById: auth.userId,
      },
      data: updateData,
    })

    // Log activity
    await db.activityLog.create({
      data: {
        action: "update",
        entityType: "record",
        entityId: recordNumbers.join(","),
        details: JSON.stringify({ recordNumbers, bulkAction: "edit", changedFields: Object.keys(updateData), count: result.count }),
        userId: auth.userId,
      },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error("Bulk edit error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
