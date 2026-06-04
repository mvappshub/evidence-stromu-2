import { db } from "@/lib/db"

export interface ImportRowInput {
  speciesLatin: string
  plantedAt: string
  lat: number
  lng: number
  locality?: string | null
  note?: string | null
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

/** Exported for unit tests (date formats accepted by CSV/JSON import). */
export function parsePlantedAt(value: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value + "T00:00:00.000Z")
  }
  if (/^\d{1,2}\.\s*\d{1,2}\.\s*\d{4}$/.test(value)) {
    const parts = value.split(".")
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    return new Date(Date.UTC(year, month, day))
  }
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : parsed
}

export async function importTreeRecords(
  userId: string,
  rows: ImportRowInput[],
  rowOffset = 0
): Promise<ImportResult> {
  let imported = 0
  let skipped = 0
  const errors: string[] = []
  const toCreate: Array<{
    speciesLatin: string
    plantedAt: Date
    lat: number
    lng: number
    locality: string | null
    note: string | null
    createdById: string
  }> = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const line = rowOffset + i + 1

    if (!row.speciesLatin?.trim()) {
      errors.push(`Řádek ${line}: Chybí druh`)
      skipped++
      continue
    }
    if (!row.plantedAt?.trim()) {
      errors.push(`Řádek ${line}: Chybí datum výsadby`)
      skipped++
      continue
    }
    const lat = row.lat
    const lng = row.lng
    if (isNaN(lat) || isNaN(lng)) {
      errors.push(`Řádek ${line}: Neplatné souřadnice`)
      skipped++
      continue
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      errors.push(`Řádek ${line}: Souřadnice mimo rozsah`)
      skipped++
      continue
    }

    const plantedAt = parsePlantedAt(row.plantedAt.trim())
    if (!plantedAt) {
      errors.push(`Řádek ${line}: Neplatné datum "${row.plantedAt}"`)
      skipped++
      continue
    }

    toCreate.push({
      speciesLatin: row.speciesLatin.trim(),
      plantedAt,
      lat,
      lng,
      locality: row.locality?.trim() || null,
      note: row.note?.trim() || null,
      createdById: userId,
    })
  }

  const BATCH = 100
  for (let i = 0; i < toCreate.length; i += BATCH) {
    const chunk = toCreate.slice(i, i + BATCH)
    await db.$transaction(
      chunk.map((data) => db.treeRecord.create({ data }))
    )
    imported += chunk.length
  }

  return { imported, skipped, errors: errors.slice(0, 100) }
}
