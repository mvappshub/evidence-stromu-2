import Papa from "papaparse"
import { resolveCsvHeaderAlias } from "@/lib/csv-header-map"
import type { CsvImportFieldKey } from "@/lib/csv-import-fields"

export type CsvColumnMapping = Record<CsvImportFieldKey, string>

export type ParsedCsvTable = {
  headers: string[]
  rows: Record<string, string>[]
}

export function createEmptyColumnMapping(): CsvColumnMapping {
  return {
    speciesLatin: "",
    plantedAt: "",
    lat: "",
    lng: "",
    locality: "",
    note: "",
  }
}

export function parseCsvText(rawText: string): ParsedCsvTable {
  const text = rawText.replace(/^\uFEFF/, "")

  let result = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
  })

  let headers = result.meta.fields ?? []
  let data = result.data as Record<string, string>[]

  if (headers.length <= 1 && text.includes(",")) {
    const commaResult = Papa.parse<Record<string, string>>(text, {
      header: true,
      delimiter: ",",
      skipEmptyLines: true,
    })
    if ((commaResult.meta.fields ?? []).length > headers.length) {
      headers = commaResult.meta.fields ?? []
      data = commaResult.data as Record<string, string>[]
    }
  }

  if (headers.length <= 1) {
    const autoResult = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    })
    if ((autoResult.meta.fields ?? []).length > headers.length) {
      headers = autoResult.meta.fields ?? []
      data = autoResult.data as Record<string, string>[]
    }
  }

  return { headers, rows: data }
}

export function buildAutoColumnMapping(headers: string[]): CsvColumnMapping {
  const autoMap = createEmptyColumnMapping()

  for (const h of headers) {
    const normalized = h.trim().toLowerCase()
    const fieldKey = resolveCsvHeaderAlias(normalized)
    if (fieldKey && !autoMap[fieldKey]) {
      autoMap[fieldKey] = h
    }
  }

  return autoMap
}
