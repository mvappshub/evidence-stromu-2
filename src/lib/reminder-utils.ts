import { addDays, addWeeks, addMonths, addYears } from "date-fns"

export function calculateNextDueAt(
  mode: "interval" | "date",
  startAt: Date | null,
  intervalNum: number | null,
  intervalUnit: "day" | "week" | "month" | "year" | null,
  dueAt: Date | null
): Date {
  if (mode === "date" && dueAt) return dueAt
  if (mode === "interval" && intervalNum && intervalUnit) {
    const base = startAt || new Date()
    switch (intervalUnit) {
      case "day": return addDays(base, intervalNum)
      case "week": return addWeeks(base, intervalNum)
      case "month": return addMonths(base, intervalNum)
      case "year": return addYears(base, intervalNum)
    }
  }
  return addDays(new Date(), 30) // fallback
}

export function advanceIntervalReminder(
  currentNextDueAt: Date,
  intervalNum: number,
  intervalUnit: "day" | "week" | "month" | "year"
): Date {
  switch (intervalUnit) {
    case "day": return addDays(currentNextDueAt, intervalNum)
    case "week": return addWeeks(currentNextDueAt, intervalNum)
    case "month": return addMonths(currentNextDueAt, intervalNum)
    case "year": return addYears(currentNextDueAt, intervalNum)
  }
}
