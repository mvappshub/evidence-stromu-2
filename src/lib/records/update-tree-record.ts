import type { Prisma, PrismaClient } from "@prisma/client"
import { enrichRecordLocationFromCoords } from "@/lib/records/enrich-record-location"
import { parseInputDate } from "@/lib/server-date"

export type UpdateTreeRecordInput = {
  speciesLatin?: string
  plantedAt?: string
  lat?: number
  lng?: number
  locality?: string | null
  orpKod?: number | null
  note?: string | null
  photoPath?: string | null
}

export type UpdateTreeRecordResult =
  | {
      ok: true
      record: Prisma.TreeRecordGetPayload<object>
      changedFields: string[]
    }
  | { ok: false; code: "not_found" | "invalid_planted_at"; message: string }

export async function updateTreeRecord(
  db: PrismaClient,
  userId: string,
  recordNumber: number,
  update: UpdateTreeRecordInput
): Promise<UpdateTreeRecordResult> {
  const existing = await db.treeRecord.findFirst({
    where: { recordNumber, createdById: userId },
  })
  if (!existing) {
    return { ok: false, code: "not_found", message: "Record not found" }
  }

  const data: Prisma.TreeRecordUpdateInput = {}

  if (update.speciesLatin !== undefined) data.speciesLatin = update.speciesLatin
  if (update.plantedAt !== undefined) {
    const plantedAt = parseInputDate(update.plantedAt)
    if (!plantedAt) {
      return {
        ok: false,
        code: "invalid_planted_at",
        message: "Invalid plantedAt date",
      }
    }
    data.plantedAt = plantedAt
  }
  if (update.lat !== undefined) data.lat = update.lat
  if (update.lng !== undefined) data.lng = update.lng
  if (update.locality !== undefined) data.locality = update.locality
  if (update.orpKod !== undefined) data.orpKod = update.orpKod

  const coordsChanged =
    update.lat !== undefined || update.lng !== undefined
  if (coordsChanged) {
    const lng = update.lng ?? existing.lng
    const lat = update.lat ?? existing.lat
    const enriched = await enrichRecordLocationFromCoords(lng, lat, {
      fillLocality: update.locality === undefined && !existing.locality,
    })
    if (enriched.orpKod !== undefined) data.orpKod = enriched.orpKod
    if (enriched.locality !== undefined && update.locality === undefined) {
      data.locality = enriched.locality
    }
  }
  if (update.note !== undefined) data.note = update.note
  if (update.photoPath !== undefined) data.photoPath = update.photoPath

  const record = await db.treeRecord.update({
    where: { recordNumber },
    data,
  })

  const changedFields = Object.keys(data)
  await db.activityLog.create({
    data: {
      action: "update",
      entityType: "record",
      entityId: String(recordNumber),
      details: JSON.stringify({ recordNumber, changedFields }),
      userId,
    },
  })

  return { ok: true, record, changedFields }
}
