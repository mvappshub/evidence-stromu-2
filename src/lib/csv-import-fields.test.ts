import { describe, expect, it } from "vitest"
import { createEmptyColumnMapping } from "@/lib/csv-import-parse"
import {
  areRequiredFieldsMapped,
  CSV_IMPORT_FIELD_KEYS,
  FIELDS,
} from "@/lib/csv-import-fields"

describe("FIELDS / CSV_IMPORT_FIELD_KEYS", () => {
  it("defines six fields in canonical order", () => {
    expect(FIELDS.map((f) => f.key)).toEqual([
      "speciesLatin",
      "plantedAt",
      "lat",
      "lng",
      "locality",
      "note",
    ])
    expect(CSV_IMPORT_FIELD_KEYS).toEqual(FIELDS.map((f) => f.key))
  })

  it("marks speciesLatin, plantedAt, lat, lng as required", () => {
    expect(FIELDS.filter((f) => f.required).map((f) => f.key)).toEqual([
      "speciesLatin",
      "plantedAt",
      "lat",
      "lng",
    ])
    expect(FIELDS.filter((f) => !f.required).map((f) => f.key)).toEqual([
      "locality",
      "note",
    ])
  })

  it("exposes Czech labels for the mapping UI", () => {
    expect(FIELDS.find((f) => f.key === "speciesLatin")?.label).toBe("Druh")
    expect(FIELDS.find((f) => f.key === "plantedAt")?.label).toBe(
      "Datum výsadby"
    )
  })
})

describe("areRequiredFieldsMapped", () => {
  it("returns false when any required field is unmapped", () => {
    const mapping = createEmptyColumnMapping()
    mapping.speciesLatin = "druh"
    mapping.plantedAt = "datum"
    mapping.lat = "lat"
    expect(areRequiredFieldsMapped(mapping)).toBe(false)
  })

  it("returns true when all required fields are mapped", () => {
    const mapping = createEmptyColumnMapping()
    mapping.speciesLatin = "druh"
    mapping.plantedAt = "datum"
    mapping.lat = "lat"
    mapping.lng = "lng"
    expect(areRequiredFieldsMapped(mapping)).toBe(true)
  })

  it("returns true when optional fields stay unmapped", () => {
    const mapping = createEmptyColumnMapping()
    mapping.speciesLatin = "druh"
    mapping.plantedAt = "datum"
    mapping.lat = "lat"
    mapping.lng = "lng"
    mapping.locality = ""
    mapping.note = ""
    expect(areRequiredFieldsMapped(mapping)).toBe(true)
  })

  it("returns false for empty mapping", () => {
    expect(areRequiredFieldsMapped(createEmptyColumnMapping())).toBe(false)
  })
})
