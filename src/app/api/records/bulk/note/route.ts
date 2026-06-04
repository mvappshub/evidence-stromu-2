import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { getOwnedRecordNumbers } from "@/lib/assert-records-owned"

const bulkNoteSchema = z.object({
  recordNumbers: z.array(z.number().int()).min(1, "At least one record number is required"),
  note: z.string().min(1, "Note text is required"),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
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

    const owned = await getOwnedRecordNumbers(auth.userId, recordNumbers)
    if (!owned.ok) return owned.response
    const { ownedNumbers } = owned

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
