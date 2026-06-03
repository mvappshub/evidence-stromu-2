import { describe, expect, it } from "vitest"
import { parsePlantedAt } from "@/lib/import-records"

describe("parsePlantedAt", () => {
  it("parses ISO date YYYY-MM-DD as UTC midnight", () => {
    const d = parsePlantedAt("2024-06-01")
    expect(d).not.toBeNull()
    expect(d!.toISOString()).toBe("2024-06-01T00:00:00.000Z")
  })

  it("parses Czech dotted date D.M.YYYY", () => {
    const d = parsePlantedAt("15. 3. 2024")
    expect(d).not.toBeNull()
    expect(d!.toISOString()).toBe("2024-03-15T00:00:00.000Z")
  })

  it("returns null for empty or unparseable date strings", () => {
    expect(parsePlantedAt("")).toBeNull()
    expect(parsePlantedAt("not-a-date")).toBeNull()
  })
})
