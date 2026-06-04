import { describe, expect, it } from "vitest"
import { parseSpeciesCsvText } from "@/lib/species-import-parse"

describe("parseSpeciesCsvText", () => {
  it("parses single-column lines without header", () => {
    const text = "Quercus robur\nTilia cordata\n"
    expect(parseSpeciesCsvText(text)).toEqual(["Quercus robur", "Tilia cordata"])
  })

  it("parses semicolon CSV with druh column", () => {
    const text = "druh;poznamka\nQuercus robur;ok\nBetula pendula;"
    expect(parseSpeciesCsvText(text)).toEqual(["Quercus robur", "Betula pendula"])
  })
})
