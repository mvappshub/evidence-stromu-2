import { describe, expect, it } from "vitest"

/**
 * Mirrors RecordsTable.tsx preset logic (pre-registry) for characterization.
 * Step 2: tests import from @/lib/records-table-presets instead.
 */

/** Local calendar anchor (same convention as RecordsTable `new Date()`). */
const ANCHOR = new Date(2024, 5, 15, 12, 0, 0)

type PresetId = "thisMonth" | "thisYear" | "last30" | "noReminder" | "hasNote"

type PresetState = {
  dateFrom: string | null
  dateTo: string | null
  hasNoteFilter: boolean
  noReminderFilter: boolean
}

type DateContext = {
  todayStr: string
  thisMonthStart: string
  thisYearStart: string
  last30DaysStart: string
}

function buildDateContext(today: Date): DateContext {
  const todayStr = today.toISOString().split("T")[0]
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0]
  const thisYearStart = new Date(today.getFullYear(), 0, 1)
    .toISOString()
    .split("T")[0]
  const last30DaysStart = new Date(
    today.getTime() - 30 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0]
  return { todayStr, thisMonthStart, thisYearStart, last30DaysStart }
}

function getPresetRange(
  preset: PresetId,
  today: Date
): { dateFrom: string; dateTo: string } | null {
  const c = buildDateContext(today)
  if (preset === "thisMonth") {
    return { dateFrom: c.thisMonthStart, dateTo: c.todayStr }
  }
  if (preset === "thisYear") {
    return { dateFrom: c.thisYearStart, dateTo: c.todayStr }
  }
  if (preset === "last30") {
    return { dateFrom: c.last30DaysStart, dateTo: c.todayStr }
  }
  return null
}

/** Mirrors RecordsTable isPresetActive (lines 213–219). */
function isPresetActiveChar(preset: PresetId, s: PresetState, today: Date): boolean {
  const c = buildDateContext(today)
  if (preset === "thisMonth") {
    return s.dateFrom === c.thisMonthStart && s.dateTo === c.todayStr
  }
  if (preset === "thisYear") {
    return s.dateFrom === c.thisYearStart && s.dateTo === c.todayStr
  }
  if (preset === "last30") {
    return s.dateFrom === c.last30DaysStart && s.dateTo === c.todayStr
  }
  if (preset === "noReminder") return s.noReminderFilter
  if (preset === "hasNote") return s.hasNoteFilter
  return false
}

type ToggleResult =
  | { action: "clearDateRange" }
  | { action: "setDateRange"; dateFrom: string; dateTo: string }
  | { action: "setHasNoteFilter"; value: boolean }
  | { action: "setNoReminderFilter"; value: boolean }

/** Mirrors RecordsTable togglePreset outcomes. */
function togglePresetChar(
  preset: PresetId,
  s: PresetState,
  today: Date
): ToggleResult {
  const active = isPresetActiveChar(preset, s, today)
  if (preset === "thisMonth" || preset === "thisYear" || preset === "last30") {
    if (active) return { action: "clearDateRange" }
    const range = getPresetRange(preset, today)!
    return {
      action: "setDateRange",
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    }
  }
  if (preset === "noReminder") {
    return { action: "setNoReminderFilter", value: !active }
  }
  return { action: "setHasNoteFilter", value: !active }
}

function state(overrides: Partial<PresetState> = {}): PresetState {
  return {
    dateFrom: null,
    dateTo: null,
    hasNoteFilter: false,
    noReminderFilter: false,
    ...overrides,
  }
}

describe("records table date presets (characterization)", () => {
  describe("thisMonth", () => {
    const preset = "thisMonth" as const

    it("range: first day of month → today", () => {
      const c = buildDateContext(ANCHOR)
      expect(getPresetRange(preset, ANCHOR)).toEqual({
        dateFrom: c.thisMonthStart,
        dateTo: c.todayStr,
      })
      expect(getPresetRange(preset, ANCHOR)!.dateTo).toBe(
        ANCHOR.toISOString().split("T")[0]
      )
    })

    it("isPresetActive: true only when dateFrom/dateTo match range", () => {
      const range = getPresetRange(preset, ANCHOR)!
      expect(isPresetActiveChar(preset, state(range), ANCHOR)).toBe(true)
      expect(
        isPresetActiveChar(
          preset,
          state({ dateFrom: range.dateFrom, dateTo: "2024-01-01" }),
          ANCHOR
        )
      ).toBe(false)
      expect(isPresetActiveChar(preset, state(), ANCHOR)).toBe(false)
    })

    it("toggle: active → clearDateRange; inactive → set range", () => {
      const range = getPresetRange(preset, ANCHOR)!
      expect(togglePresetChar(preset, state(range), ANCHOR)).toEqual({
        action: "clearDateRange",
      })
      expect(togglePresetChar(preset, state(), ANCHOR)).toEqual({
        action: "setDateRange",
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      })
    })
  })

  describe("thisYear", () => {
    const preset = "thisYear" as const

    it("range: Jan 1 → today", () => {
      const c = buildDateContext(ANCHOR)
      expect(getPresetRange(preset, ANCHOR)).toEqual({
        dateFrom: c.thisYearStart,
        dateTo: c.todayStr,
      })
    })

    it("isPresetActive", () => {
      const range = getPresetRange(preset, ANCHOR)!
      expect(isPresetActiveChar(preset, state(range), ANCHOR)).toBe(true)
      expect(isPresetActiveChar(preset, state(), ANCHOR)).toBe(false)
    })

    it("toggle", () => {
      const range = getPresetRange(preset, ANCHOR)!
      expect(togglePresetChar(preset, state(range), ANCHOR)).toEqual({
        action: "clearDateRange",
      })
      expect(togglePresetChar(preset, state(), ANCHOR)).toEqual({
        action: "setDateRange",
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      })
    })
  })

  describe("last30", () => {
    const preset = "last30" as const

    it("range: today minus 30 days → today", () => {
      const c = buildDateContext(ANCHOR)
      expect(getPresetRange(preset, ANCHOR)).toEqual({
        dateFrom: c.last30DaysStart,
        dateTo: c.todayStr,
      })
      expect(getPresetRange(preset, ANCHOR)!.dateFrom).toBe(c.last30DaysStart)
      expect(
        new Date(c.last30DaysStart).getTime()
      ).toBeLessThan(new Date(c.todayStr).getTime())
    })

    it("isPresetActive", () => {
      const range = getPresetRange(preset, ANCHOR)!
      expect(isPresetActiveChar(preset, state(range), ANCHOR)).toBe(true)
      const c = buildDateContext(ANCHOR)
      expect(
        isPresetActiveChar(
          preset,
          state({ dateFrom: "2024-06-01", dateTo: c.todayStr }),
          ANCHOR
        )
      ).toBe(false)
    })

    it("toggle", () => {
      const range = getPresetRange(preset, ANCHOR)!
      expect(togglePresetChar(preset, state(), ANCHOR)).toEqual({
        action: "setDateRange",
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      })
    })
  })

  describe("noReminder", () => {
    const preset = "noReminder" as const

    it("range: none (boolean preset)", () => {
      expect(getPresetRange(preset, ANCHOR)).toBeNull()
    })

    it("isPresetActive: mirrors noReminderFilter", () => {
      expect(isPresetActiveChar(preset, state({ noReminderFilter: true }), ANCHOR)).toBe(
        true
      )
      expect(isPresetActiveChar(preset, state(), ANCHOR)).toBe(false)
    })

    it("toggle: flips noReminderFilter", () => {
      expect(togglePresetChar(preset, state(), ANCHOR)).toEqual({
        action: "setNoReminderFilter",
        value: true,
      })
      expect(
        togglePresetChar(preset, state({ noReminderFilter: true }), ANCHOR)
      ).toEqual({ action: "setNoReminderFilter", value: false })
    })
  })

  describe("hasNote", () => {
    const preset = "hasNote" as const

    it("range: none (boolean preset)", () => {
      expect(getPresetRange(preset, ANCHOR)).toBeNull()
    })

    it("isPresetActive: mirrors hasNoteFilter", () => {
      expect(isPresetActiveChar(preset, state({ hasNoteFilter: true }), ANCHOR)).toBe(
        true
      )
      expect(isPresetActiveChar(preset, state(), ANCHOR)).toBe(false)
    })

    it("toggle: flips hasNoteFilter", () => {
      expect(togglePresetChar(preset, state(), ANCHOR)).toEqual({
        action: "setHasNoteFilter",
        value: true,
      })
      expect(togglePresetChar(preset, state({ hasNoteFilter: true }), ANCHOR)).toEqual({
        action: "setHasNoteFilter",
        value: false,
      })
    })
  })
})
