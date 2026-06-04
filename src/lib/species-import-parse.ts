import Papa from "papaparse"
import { resolveCsvHeaderAlias } from "@/lib/csv-header-map"

const SPECIES_HEADER_ALIASES = ["species", "specieslatin", "druh", "latin", "latinname", "nazev"]

export function parseSpeciesCsvText(rawText: string): string[] {
  const text = rawText.replace(/^\uFEFF/, "").trim()
  if (text && !text.includes(";") && !text.includes(",")) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  }

  let result = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
  })

  let headers = result.meta.fields ?? []
  let rows = result.data as Record<string, string>[]

  if (headers.length <= 1 && text.includes(",")) {
    const commaResult = Papa.parse<Record<string, string>>(text, {
      header: true,
      delimiter: ",",
      skipEmptyLines: true,
    })
    headers = commaResult.meta.fields ?? []
    rows = commaResult.data as Record<string, string>[]
  }

  if (headers.length === 0) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    return lines
  }

  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase())
  let columnKey: string | null = null

  for (const header of headers) {
    const alias = resolveCsvHeaderAlias(header)
    if (alias === "speciesLatin") {
      columnKey = header
      break
    }
    const lower = header.trim().toLowerCase()
    if (SPECIES_HEADER_ALIASES.includes(lower)) {
      columnKey = header
      break
    }
  }

  if (!columnKey) {
    const idx = normalizedHeaders.findIndex((h) =>
      SPECIES_HEADER_ALIASES.some((a) => h.includes(a))
    )
    columnKey = idx >= 0 ? headers[idx]! : headers[0]!
  }

  return rows
    .map((row) => (row[columnKey!] ?? "").trim())
    .filter(Boolean)
}
