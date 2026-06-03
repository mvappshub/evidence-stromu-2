export type { CsvImportFieldKey } from "@/lib/csv-import-fields"
export { CSV_IMPORT_FIELD_KEYS } from "@/lib/csv-import-fields"
import type { CsvImportFieldKey } from "@/lib/csv-import-fields"

/**
 * Czech and English CSV header aliases → canonical field key.
 * Single source of truth for client auto-mapping and server CSV upload.
 */
export const CSV_HEADER_ALIASES: Record<string, CsvImportFieldKey> = {
  druh: "speciesLatin",
  species: "speciesLatin",
  "datum výsadby": "plantedAt",
  datum_vysadby: "plantedAt",
  datum: "plantedAt",
  date: "plantedAt",
  "zem. šířka": "lat",
  zem_sirka: "lat",
  "zem.širka": "lat",
  lat: "lat",
  latitude: "lat",
  "zem. délka": "lng",
  zem_delka: "lng",
  "zem.delka": "lng",
  lng: "lng",
  lon: "lng",
  longitude: "lng",
  lokalita: "locality",
  locality: "locality",
  location: "locality",
  poznámka: "note",
  poznamka: "note",
  note: "note",
}

/** Resolve a lowercased, trimmed header alias to a field key (UI auto-map). */
export function resolveCsvHeaderAlias(
  normalizedHeader: string
): CsvImportFieldKey | undefined {
  return CSV_HEADER_ALIASES[normalizedHeader]
}

/** Map header to canonical field key, or pass through normalized raw name (server CSV). */
export function normalizeCsvHeader(h: string): string {
  const normalized = h.trim().toLowerCase()
  return CSV_HEADER_ALIASES[normalized] ?? normalized
}
