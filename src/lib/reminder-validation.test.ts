import { describe, expect, it } from "vitest"
import {
  parseReminderCreateDates,
  validateReminderModeFields,
} from "@/lib/reminder-validation"

describe("validateReminderModeFields", () => {
  it("requires intervalNum and intervalUnit in interval mode", () => {
    const result = validateReminderModeFields("interval", undefined, undefined, undefined)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toBe(
        "Interval mode requires intervalNum and intervalUnit"
      )
    }
  })

  it("requires dueAt in date mode", () => {
    const result = validateReminderModeFields("date", undefined, undefined, undefined)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toBe("Date mode requires dueAt")
    }
  })

  it("accepts valid interval mode", () => {
    expect(
      validateReminderModeFields("interval", 2, "week", undefined).ok
    ).toBe(true)
  })
})

describe("parseReminderCreateDates", () => {
  it("rejects invalid startAt", () => {
    const result = parseReminderCreateDates("not-a-date", undefined)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toBe("Invalid startAt date")
    }
  })

  it("parses ISO dates", () => {
    const result = parseReminderCreateDates("2024-06-01", "2024-12-31")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.parsedStartAt).toBeInstanceOf(Date)
      expect(result.value.parsedDueAt).toBeInstanceOf(Date)
    }
  })
})
