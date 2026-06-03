import { describe, expect, it } from "vitest"
import { formatDms, formatSjtsk, wgs84ToSjtsk } from "@/lib/coords"

describe("wgs84ToSjtsk", () => {
  it("is deterministic for the same WGS84 point", () => {
    const a = wgs84ToSjtsk(50.0875, 14.4214)
    const b = wgs84ToSjtsk(50.0875, 14.4214)
    expect(a).toEqual(b)
  })

  it("returns S-JTSK coordinates in plausible ranges for Prague (regression ranges)", () => {
    const { x, y } = wgs84ToSjtsk(50.0875, 14.4214)
    expect(x).toBeGreaterThan(50_000)
    expect(x).toBeLessThan(150_000)
    expect(y).toBeGreaterThan(450_000)
    expect(y).toBeLessThan(550_000)
  })

  it("matches golden values for a fixed reference point (regression guard)", () => {
    const { x, y } = wgs84ToSjtsk(50.0875, 14.4214)
    expect(x).toBeCloseTo(78894.59, 2)
    expect(y).toBeCloseTo(509014.31, 2)
  })
})

describe("formatDms", () => {
  it("formats latitude and longitude with N/E hemispheres", () => {
    const s = formatDms(50.0875, 14.4214)
    expect(s).toMatch(/N/)
    expect(s).toMatch(/E/)
    expect(s).toContain("°")
  })
})

describe("formatSjtsk", () => {
  it("formats rounded S-JTSK coordinates", () => {
    expect(formatSjtsk(78894.59, 509014.31)).toBe("X: 78895 Y: 509014")
  })
})
