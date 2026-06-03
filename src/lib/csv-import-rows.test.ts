import { describe, expect, it } from "vitest"
import type { CsvColumnMapping } from "@/lib/csv-import-parse"
import { createEmptyColumnMapping } from "@/lib/csv-import-parse"
import { mapCsvRowsToImportInputs } from "@/lib/csv-import-rows"
import type { ImportRowInput } from "@/lib/import-records"

function fullMapping(overrides: Partial<CsvColumnMapping> = {}): CsvColumnMapping {
  return {
    speciesLatin: "druh",
    plantedAt: "datum",
    lat: "lat",
    lng: "lng",
    locality: "lokalita",
    note: "poznamka",
    ...overrides,
  }
}

describe("mapCsvRowsToImportInputs", () => {
  it("maps a full row with comma decimal coordinates", () => {
    const rows = [
      {
        druh: " Quercus ",
        datum: "2020-01-01",
        lat: "50,0755",
        lng: "14,4378",
        lokalita: " Brno ",
        poznamka: " ok ",
      },
    ]
    const result = mapCsvRowsToImportInputs(rows, fullMapping())
    expect(result).toEqual<ImportRowInput[]>([
      {
        speciesLatin: "Quercus",
        plantedAt: "2020-01-01",
        lat: 50.0755,
        lng: 14.4378,
        locality: "Brno",
        note: "ok",
      },
    ])
  })

  it("parses dot decimal coordinates", () => {
    const rows = [{ druh: "Tilia", datum: "2021-06-01", lat: "49.2", lng: "16.6" }]
    const mapping = fullMapping({ locality: "", note: "" })
    expect(mapCsvRowsToImportInputs(rows, mapping)[0].lat).toBe(49.2)
    expect(mapCsvRowsToImportInputs(rows, mapping)[0].lng).toBe(16.6)
  })

  it("sets optional fields to null when cells are empty", () => {
    const rows = [
      {
        druh: "Acer",
        datum: "2020-01-01",
        lat: "50",
        lng: "14",
        lokalita: "",
        poznamka: "   ",
      },
    ]
    const result = mapCsvRowsToImportInputs(rows, fullMapping())
    expect(result[0].locality).toBeNull()
    expect(result[0].note).toBeNull()
  })

  it("leaves optional fields null when columns are unmapped", () => {
    const rows = [{ druh: "Acer", datum: "2020-01-01", lat: "50", lng: "14" }]
    const mapping = fullMapping({ locality: "", note: "" })
    const result = mapCsvRowsToImportInputs(rows, mapping)
    expect(result[0].locality).toBeNull()
    expect(result[0].note).toBeNull()
  })

  it("returns empty strings for missing required text fields (same as dialog)", () => {
    const rows = [{ druh: "", datum: "", lat: "", lng: "" }]
    const mapping = fullMapping({ locality: "", note: "" })
    const result = mapCsvRowsToImportInputs(rows, mapping)
    expect(result[0]).toEqual({
      speciesLatin: "",
      plantedAt: "",
      lat: NaN,
      lng: NaN,
      locality: null,
      note: null,
    })
  })

  it("produces NaN for non-numeric coordinates", () => {
    const rows = [
      { druh: "X", datum: "2020-01-01", lat: "north", lng: "east" },
    ]
    const mapping = fullMapping({ locality: "", note: "" })
    const result = mapCsvRowsToImportInputs(rows, mapping)
    expect(Number.isNaN(result[0].lat)).toBe(true)
    expect(Number.isNaN(result[0].lng)).toBe(true)
  })

  it("maps multiple rows preserving order", () => {
    const rows = [
      { druh: "A", datum: "2020-01-01", lat: "1", lng: "2" },
      { druh: "B", datum: "2021-01-01", lat: "3", lng: "4" },
    ]
    const mapping = fullMapping({ locality: "", note: "" })
    const result = mapCsvRowsToImportInputs(rows, mapping)
    expect(result).toHaveLength(2)
    expect(result[0].speciesLatin).toBe("A")
    expect(result[1].speciesLatin).toBe("B")
  })

  it("handles empty row array", () => {
    expect(mapCsvRowsToImportInputs([], createEmptyColumnMapping())).toEqual([])
  })
})
