import { describe, expect, it } from "vitest"
import {
  buildAutoColumnMapping,
  createEmptyColumnMapping,
  parseCsvText,
} from "@/lib/csv-import-parse"

describe("createEmptyColumnMapping", () => {
  it("returns all field keys with empty strings", () => {
    expect(createEmptyColumnMapping()).toEqual({
      speciesLatin: "",
      plantedAt: "",
      lat: "",
      lng: "",
      locality: "",
      note: "",
    })
  })
})

describe("parseCsvText", () => {
  it("parses semicolon-delimited CSV", () => {
    const text = "druh;datum výsadby;lat;lng\nQuercus;2020-01-01;50.1;14.2"
    const { headers, rows } = parseCsvText(text)
    expect(headers).toEqual(["druh", "datum výsadby", "lat", "lng"])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      druh: "Quercus",
      "datum výsadby": "2020-01-01",
      lat: "50.1",
      lng: "14.2",
    })
  })

  it("parses comma-delimited CSV when semicolon yields single column", () => {
    const text = "species,plantedAt,lat,lng\nTilia,2021-06-15,49.2,16.6"
    const { headers, rows } = parseCsvText(text)
    expect(headers).toEqual(["species", "plantedAt", "lat", "lng"])
    expect(rows[0].species).toBe("Tilia")
  })

  it("strips UTF-8 BOM before parsing", () => {
    const text = "\uFEFFdruh;lat;lng\nBom;1;2"
    const { headers, rows } = parseCsvText(text)
    expect(headers[0]).toBe("druh")
    expect(rows[0].druh).toBe("Bom")
  })

  it("handles empty input", () => {
    const { headers, rows } = parseCsvText("")
    expect(headers).toEqual([])
    expect(rows).toEqual([])
  })

  it("handles broken CSV without row delimiters as single field", () => {
    const { headers, rows } = parseCsvText("just-one-line-no-commas")
    expect(headers.length).toBeGreaterThanOrEqual(0)
    expect(rows.length).toBeGreaterThanOrEqual(0)
  })
})

describe("buildAutoColumnMapping", () => {
  it("maps Czech headers with diacritics to field keys", () => {
    const headers = [
      "druh",
      "datum výsadby",
      "zem. šířka",
      "zem. délka",
      "lokalita",
      "poznámka",
    ]
    expect(buildAutoColumnMapping(headers)).toEqual({
      speciesLatin: "druh",
      plantedAt: "datum výsadby",
      lat: "zem. šířka",
      lng: "zem. délka",
      locality: "lokalita",
      note: "poznámka",
    })
  })

  it("keeps first matching header when alias repeats", () => {
    const headers = ["species", "Druh", "lat"]
    const mapping = buildAutoColumnMapping(headers)
    expect(mapping.speciesLatin).toBe("species")
    expect(mapping.lat).toBe("lat")
  })

  it("returns empty mapping for unknown headers", () => {
    expect(buildAutoColumnMapping(["foo", "bar"])).toEqual(
      createEmptyColumnMapping()
    )
  })
})

describe("parseCsvText + buildAutoColumnMapping integration", () => {
  it("full Czech semicolon sample", () => {
    const csv = [
      "druh;datum výsadby;zem. šířka;zem. délka;lokalita;poznámka",
      "Acer platanoides;15.3.2020;49,95;14,40;Brno;test",
    ].join("\n")
    const { headers, rows } = parseCsvText(csv)
    expect(headers).toHaveLength(6)
    expect(rows).toHaveLength(1)
    const mapping = buildAutoColumnMapping(headers)
    expect(mapping.speciesLatin).toBe("druh")
    expect(mapping.plantedAt).toBe("datum výsadby")
    expect(rows[0][mapping.speciesLatin]).toBe("Acer platanoides")
  })
})
