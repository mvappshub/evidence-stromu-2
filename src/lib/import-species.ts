import { db } from "@/lib/db"

export interface SpeciesImportResult {
  imported: number
  updated: number
  skipped: number
  errors: string[]
}

function normalizeLatinName(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

export async function importSpeciesCatalog(
  latinNames: string[],
  rowOffset = 0
): Promise<SpeciesImportResult> {
  let imported = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < latinNames.length; i++) {
    const line = rowOffset + i + 1
    const latinName = normalizeLatinName(latinNames[i] ?? "")
    if (!latinName) {
      skipped++
      continue
    }

    try {
      const existing = await db.species.findUnique({ where: { latinName } })
      if (existing) {
        await db.species.update({
          where: { id: existing.id },
          data: { updatedAt: new Date() },
        })
        updated++
      } else {
        await db.species.create({
          data: { latinName, sortOrder: 0 },
        })
        imported++
      }
    } catch {
      errors.push(`Řádek ${line}: Nepodařilo se uložit „${latinName}"`)
    }
  }

  return { imported, updated, skipped, errors }
}
