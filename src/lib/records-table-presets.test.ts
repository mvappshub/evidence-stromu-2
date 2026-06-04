import { describe, expect, it } from "vitest"
import {
  getRecordsTablePresetDateContext,
  getRecordsTablePresetRange,
  getRecordsTablePresetToggle,
  isRecordsTablePresetActive,
  type RecordsTablePresetId,
  type RecordsTablePresetState,
} from "@/lib/records-table-presets"

/** Local calendar anchor (same convention as RecordsTable `new Date()`). */
const ANCHOR = new Date(2024, 5, 15, 12, 0, 0)

function state(overrides: Partial<RecordsTablePresetState> = {}): RecordsTablePresetState {
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
      const c = getRecordsTablePresetDateContext(ANCHOR)
      expect(getRecordsTablePresetRange(preset, ANCHOR)).toEqual({
        dateFrom: c.thisMonthStart,
        dateTo: c.todayStr,
      })
      expect(getRecordsTablePresetRange(preset, ANCHOR)!.dateTo).toBe(
        ANCHOR.toISOString().split("T")[0]
      )
    })

    it("isPresetActive: true only when dateFrom/dateTo match range", () => {
      const range = getRecordsTablePresetRange(preset, ANCHOR)!
      expect(isRecordsTablePresetActive(preset, state(range), ANCHOR)).toBe(true)
      expect(
        isRecordsTablePresetActive(
          preset,
          state({ dateFrom: range.dateFrom, dateTo: "2024-01-01" }),
          ANCHOR
        )
      ).toBe(false)
      expect(isRecordsTablePresetActive(preset, state(), ANCHOR)).toBe(false)
    })

    it("toggle: active → clearDateRange; inactive → set range", () => {
      const range = getRecordsTablePresetRange(preset, ANCHOR)!
      expect(getRecordsTablePresetToggle(preset, state(range), ANCHOR)).toEqual({
        action: "clearDateRange",
      })
      expect(getRecordsTablePresetToggle(preset, state(), ANCHOR)).toEqual({
        action: "setDateRange",
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      })
    })
  })

  describe("thisYear", () => {
    const preset = "thisYear" as const

    it("range: Jan 1 → today", () => {
      const c = getRecordsTablePresetDateContext(ANCHOR)
      expect(getRecordsTablePresetRange(preset, ANCHOR)).toEqual({
        dateFrom: c.thisYearStart,
        dateTo: c.todayStr,
      })
    })

    it("isPresetActive", () => {
      const range = getRecordsTablePresetRange(preset, ANCHOR)!
      expect(isRecordsTablePresetActive(preset, state(range), ANCHOR)).toBe(true)
      expect(isRecordsTablePresetActive(preset, state(), ANCHOR)).toBe(false)
    })

    it("toggle", () => {
      const range = getRecordsTablePresetRange(preset, ANCHOR)!
      expect(getRecordsTablePresetToggle(preset, state(range), ANCHOR)).toEqual({
        action: "clearDateRange",
      })
      expect(getRecordsTablePresetToggle(preset, state(), ANCHOR)).toEqual({
        action: "setDateRange",
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      })
    })
  })

  describe("last30", () => {
    const preset = "last30" as const

    it("range: today minus 30 days → today", () => {
      const c = getRecordsTablePresetDateContext(ANCHOR)
      expect(getRecordsTablePresetRange(preset, ANCHOR)).toEqual({
        dateFrom: c.last30DaysStart,
        dateTo: c.todayStr,
      })
      expect(getRecordsTablePresetRange(preset, ANCHOR)!.dateFrom).toBe(c.last30DaysStart)
      expect(
        new Date(c.last30DaysStart).getTime()
      ).toBeLessThan(new Date(c.todayStr).getTime())
    })

    it("isPresetActive", () => {
      const range = getRecordsTablePresetRange(preset, ANCHOR)!
      expect(isRecordsTablePresetActive(preset, state(range), ANCHOR)).toBe(true)
      const c = getRecordsTablePresetDateContext(ANCHOR)
      expect(
        isRecordsTablePresetActive(
          preset,
          state({ dateFrom: "2024-06-01", dateTo: c.todayStr }),
          ANCHOR
        )
      ).toBe(false)
    })

    it("toggle", () => {
      const range = getRecordsTablePresetRange(preset, ANCHOR)!
      expect(getRecordsTablePresetToggle(preset, state(), ANCHOR)).toEqual({
        action: "setDateRange",
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      })
    })
  })

  describe("noReminder", () => {
    const preset = "noReminder" as const

    it("range: none (boolean preset)", () => {
      expect(getRecordsTablePresetRange(preset, ANCHOR)).toBeNull()
    })

    it("isPresetActive: mirrors noReminderFilter", () => {
      expect(
        isRecordsTablePresetActive(preset, state({ noReminderFilter: true }), ANCHOR)
      ).toBe(true)
      expect(isRecordsTablePresetActive(preset, state(), ANCHOR)).toBe(false)
    })

    it("toggle: flips noReminderFilter", () => {
      expect(getRecordsTablePresetToggle(preset, state(), ANCHOR)).toEqual({
        action: "setNoReminderFilter",
        value: true,
      })
      expect(
        getRecordsTablePresetToggle(preset, state({ noReminderFilter: true }), ANCHOR)
      ).toEqual({ action: "setNoReminderFilter", value: false })
    })
  })

  describe("hasNote", () => {
    const preset = "hasNote" as const

    it("range: none (boolean preset)", () => {
      expect(getRecordsTablePresetRange(preset, ANCHOR)).toBeNull()
    })

    it("isPresetActive: mirrors hasNoteFilter", () => {
      expect(
        isRecordsTablePresetActive(preset, state({ hasNoteFilter: true }), ANCHOR)
      ).toBe(true)
      expect(isRecordsTablePresetActive(preset, state(), ANCHOR)).toBe(false)
    })

    it("toggle: flips hasNoteFilter", () => {
      expect(getRecordsTablePresetToggle(preset, state(), ANCHOR)).toEqual({
        action: "setHasNoteFilter",
        value: true,
      })
      expect(
        getRecordsTablePresetToggle(preset, state({ hasNoteFilter: true }), ANCHOR)
      ).toEqual({ action: "setHasNoteFilter", value: false })
    })
  })

  it("date presets use setDateRange toggle action", () => {
    const ids: RecordsTablePresetId[] = ["thisMonth", "thisYear", "last30"]
    for (const id of ids) {
      expect(getRecordsTablePresetToggle(id, state(), ANCHOR)?.action).toBe(
        "setDateRange"
      )
    }
  })
})
