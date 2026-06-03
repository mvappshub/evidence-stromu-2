import { describe, expect, it } from "vitest"
import {
  readTreeMapFeatureProperties,
  treeMapPropertiesFromRecord,
} from "@/lib/tree-map-geojson"

describe("readTreeMapFeatureProperties", () => {
  it("parses valid properties", () => {
    expect(
      readTreeMapFeatureProperties({
        recordNumber: 42,
        speciesLatin: "Quercus robur",
        plantedAt: "2024-06-01T00:00:00.000Z",
        locality: "Praha",
      })
    ).toEqual({
      recordNumber: 42,
      speciesLatin: "Quercus robur",
      plantedAt: "2024-06-01T00:00:00.000Z",
      locality: "Praha",
    })
  })

  it("returns feature without plantedAt as empty string (not null)", () => {
    expect(
      readTreeMapFeatureProperties({
        recordNumber: 1,
        speciesLatin: "Acer",
        locality: null,
      })
    ).toEqual({
      recordNumber: 1,
      speciesLatin: "Acer",
      plantedAt: "",
      locality: null,
    })
  })

  it("returns null when recordNumber is missing", () => {
    expect(
      readTreeMapFeatureProperties({
        speciesLatin: "Acer",
        plantedAt: "2024-01-01",
      })
    ).toBeNull()
  })
})

describe("treeMapPropertiesFromRecord", () => {
  it("serializes Date plantedAt to ISO string", () => {
    const props = treeMapPropertiesFromRecord({
      recordNumber: 5,
      speciesLatin: "Pinus",
      plantedAt: new Date("2020-03-15T00:00:00.000Z"),
      locality: null,
    })
    expect(props.plantedAt).toBe("2020-03-15T00:00:00.000Z")
  })
})
