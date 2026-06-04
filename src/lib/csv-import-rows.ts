import { CSV_IMPORT_FIELD_KEYS } from "@/lib/csv-import-fields"
import type { CsvColumnMapping } from "@/lib/csv-import-parse"
import type { ImportRowInput } from "@/lib/import-records"

export function mapCsvRowsToImportInputs(
  rows: Record<string, string>[],
  mapping: CsvColumnMapping
): ImportRowInput[] {
  const records: ImportRowInput[] = []

  for (const row of rows) {
    const mappedRow: Record<string, string> = {}
    for (const fieldKey of CSV_IMPORT_FIELD_KEYS) {
      const csvCol = mapping[fieldKey]
      mappedRow[fieldKey] = csvCol ? (row[csvCol]?.trim() ?? "") : ""
    }

    records.push({
      speciesLatin: mappedRow.speciesLatin,
      plantedAt: mappedRow.plantedAt,
      lat: parseFloat(mappedRow.lat.replace(",", ".")),
      lng: parseFloat(mappedRow.lng.replace(",", ".")),
      locality: mappedRow.locality || null,
      note: mappedRow.note || null,
    })
  }

  return records
}
