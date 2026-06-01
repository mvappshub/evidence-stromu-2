import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

const bulkNoteSchema = z.object({
  recordNumbers: z.array(z.number().int()).min(1, "At least one record number is required"),
  note: z.string().min(1, "Note text is required"),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const parsed = bulkNoteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { recordNumbers, note } = parsed.data

    // Verify all records belong to the user
    const records = await db.treeRecord.findMany({
      where: {
        recordNumber: { in: recordNumbers },
        createdById: auth.userId,
      },
      select: { recordNumber: true },
    })

    const ownedNumbers = records.map((r) => r.recordNumber)

    if (ownedNumbers.length === 0) {
      return NextResponse.json({ error: "No valid records found" }, { status: 404 })
    }

    const result = await db.treeRecord.updateMany({
      where: { recordNumber: { in: ownedNumbers } },
      data: { note },
    })

    return NextResponse.json({
      message: `Note added to ${result.count} record(s)`,
      updatedCount: result.count,
    })
  } catch (error) {
    console.error("Bulk note error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
