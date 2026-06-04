import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export type OwnedRecordNumbersResult =
  | { ok: true; ownedNumbers: number[] }
  | { ok: false; response: NextResponse }

/** Records owned by user among requested numbers; 404 when none match. */
export async function getOwnedRecordNumbers(
  userId: string,
  recordNumbers: number[]
): Promise<OwnedRecordNumbersResult> {
  const records = await db.treeRecord.findMany({
    where: {
      recordNumber: { in: recordNumbers },
      createdById: userId,
    },
    select: { recordNumber: true },
  })

  const ownedNumbers = records.map((r) => r.recordNumber)

  if (ownedNumbers.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No valid records found" },
        { status: 404 }
      ),
    }
  }

  return { ok: true, ownedNumbers }
}
