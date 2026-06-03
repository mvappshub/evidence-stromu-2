import { addDays, addMonths, addWeeks, addYears } from "date-fns"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  advanceIntervalReminder,
  calculateNextDueAt,
} from "@/lib/reminder-utils"

describe("calculateNextDueAt", () => {
  it("returns dueAt in date mode", () => {
    const dueAt = new Date("2025-08-15T10:00:00.000Z")
    expect(
      calculateNextDueAt("date", null, null, null, dueAt)
    ).toEqual(dueAt)
  })

  it("ignores interval fields in date mode when dueAt is set", () => {
    const dueAt = new Date("2025-08-15T10:00:00.000Z")
    const startAt = new Date("2020-01-01T00:00:00.000Z")
    expect(
      calculateNextDueAt("date", startAt, 7, "day", dueAt)
    ).toEqual(dueAt)
  })

  it("adds days from startAt in interval mode", () => {
    const startAt = new Date("2024-03-10T00:00:00.000Z")
    expect(
      calculateNextDueAt("interval", startAt, 14, "day", null)
    ).toEqual(addDays(startAt, 14))
  })

  it("adds weeks from startAt in interval mode", () => {
    const startAt = new Date("2024-03-10T00:00:00.000Z")
    expect(
      calculateNextDueAt("interval", startAt, 2, "week", null)
    ).toEqual(addWeeks(startAt, 2))
  })

  it("adds months from startAt including end-of-month transition", () => {
    const startAt = new Date("2024-01-31T00:00:00.000Z")
    expect(
      calculateNextDueAt("interval", startAt, 1, "month", null)
    ).toEqual(addMonths(startAt, 1))
  })

  it("adds years from startAt across year boundary", () => {
    const startAt = new Date("2023-12-15T00:00:00.000Z")
    expect(
      calculateNextDueAt("interval", startAt, 1, "year", null)
    ).toEqual(addYears(startAt, 1))
  })

  it("uses current time as base when startAt is null in interval mode", () => {
    const now = new Date("2024-06-01T12:00:00.000Z")
    vi.setSystemTime(now)
    expect(
      calculateNextDueAt("interval", null, 3, "month", null)
    ).toEqual(addMonths(now, 3))
    vi.useRealTimers()
  })

  describe("fallback when date mode has no dueAt or interval is incomplete", () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2024-06-01T12:00:00.000Z"))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("returns 30 days from now when mode is date but dueAt is null", () => {
      const now = new Date("2024-06-01T12:00:00.000Z")
      expect(
        calculateNextDueAt("date", null, null, null, null)
      ).toEqual(addDays(now, 30))
    })

    it("returns 30 days from now when interval mode lacks intervalNum", () => {
      const now = new Date("2024-06-01T12:00:00.000Z")
      expect(
        calculateNextDueAt("interval", new Date("2020-01-01"), null, "month", null)
      ).toEqual(addDays(now, 30))
    })

    it("returns 30 days from now when interval mode lacks intervalUnit", () => {
      const now = new Date("2024-06-01T12:00:00.000Z")
      expect(
        calculateNextDueAt("interval", new Date("2020-01-01"), 2, null, null)
      ).toEqual(addDays(now, 30))
    })
  })
})

describe("advanceIntervalReminder", () => {
  const current = new Date("2024-05-20T00:00:00.000Z")

  it("advances by days", () => {
    expect(advanceIntervalReminder(current, 10, "day")).toEqual(
      addDays(current, 10)
    )
  })

  it("advances by weeks", () => {
    expect(advanceIntervalReminder(current, 3, "week")).toEqual(
      addWeeks(current, 3)
    )
  })

  it("advances by months across month boundary", () => {
    const jan31 = new Date("2024-01-31T00:00:00.000Z")
    expect(advanceIntervalReminder(jan31, 1, "month")).toEqual(
      addMonths(jan31, 1)
    )
  })

  it("advances by years", () => {
    expect(advanceIntervalReminder(current, 2, "year")).toEqual(
      addYears(current, 2)
    )
  })
})
