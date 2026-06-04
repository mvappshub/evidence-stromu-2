export const FIELDS = [
  { key: "speciesLatin", label: "Druh", required: true },
  { key: "plantedAt", label: "Datum výsadby", required: true },
  { key: "lat", label: "Zem. šířka", required: true },
  { key: "lng", label: "Zem. délka", required: true },
  { key: "locality", label: "Lokalita", required: false },
  { key: "note", label: "Poznámka", required: false },
] as const

export type CsvImportFieldKey = (typeof FIELDS)[number]["key"]

export const CSV_IMPORT_FIELD_KEYS: readonly CsvImportFieldKey[] = FIELDS.map(
  (field) => field.key
)

export function areRequiredFieldsMapped(
  mapping: Record<CsvImportFieldKey, string>
): boolean {
  return FIELDS.filter((field) => field.required).every(
    (field) => mapping[field.key] !== ""
  )
}
