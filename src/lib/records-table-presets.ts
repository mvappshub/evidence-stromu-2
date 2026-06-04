export type RecordsTablePresetId =
  | "thisMonth"
  | "thisYear"
  | "last30"
  | "noReminder"
  | "hasNote"

export type RecordsTablePresetState = {
  dateFrom: string | null
  dateTo: string | null
  hasNoteFilter: boolean
  noReminderFilter: boolean
}

export type RecordsTablePresetDateContext = {
  todayStr: string
  thisMonthStart: string
  thisYearStart: string
  last30DaysStart: string
}

export type RecordsTablePresetToggleResult =
  | { action: "clearDateRange" }
  | { action: "setDateRange"; dateFrom: string; dateTo: string }
  | { action: "setHasNoteFilter"; value: boolean }
  | { action: "setNoReminderFilter"; value: boolean }

type DateRangePresetDef = {
  kind: "dateRange"
  range: (
    ctx: RecordsTablePresetDateContext
  ) => { dateFrom: string; dateTo: string }
  isActive: (
    state: RecordsTablePresetState,
    ctx: RecordsTablePresetDateContext
  ) => boolean
}

type BooleanPresetDef = {
  kind: "boolean"
  isActive: (state: RecordsTablePresetState) => boolean
  toggleValue: (active: boolean) => boolean
  toggleAction: "setHasNoteFilter" | "setNoReminderFilter"
}

type PresetDef = DateRangePresetDef | BooleanPresetDef

export function getRecordsTablePresetDateContext(
  today: Date = new Date()
): RecordsTablePresetDateContext {
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

const RECORDS_TABLE_PRESET_REGISTRY: Record<RecordsTablePresetId, PresetDef> = {
  thisMonth: {
    kind: "dateRange",
    range: (ctx) => ({ dateFrom: ctx.thisMonthStart, dateTo: ctx.todayStr }),
    isActive: (state, ctx) =>
      state.dateFrom === ctx.thisMonthStart && state.dateTo === ctx.todayStr,
  },
  thisYear: {
    kind: "dateRange",
    range: (ctx) => ({ dateFrom: ctx.thisYearStart, dateTo: ctx.todayStr }),
    isActive: (state, ctx) =>
      state.dateFrom === ctx.thisYearStart && state.dateTo === ctx.todayStr,
  },
  last30: {
    kind: "dateRange",
    range: (ctx) => ({ dateFrom: ctx.last30DaysStart, dateTo: ctx.todayStr }),
    isActive: (state, ctx) =>
      state.dateFrom === ctx.last30DaysStart && state.dateTo === ctx.todayStr,
  },
  noReminder: {
    kind: "boolean",
    isActive: (state) => state.noReminderFilter,
    toggleValue: (active) => !active,
    toggleAction: "setNoReminderFilter",
  },
  hasNote: {
    kind: "boolean",
    isActive: (state) => state.hasNoteFilter,
    toggleValue: (active) => !active,
    toggleAction: "setHasNoteFilter",
  },
}

function getPresetDef(preset: string): PresetDef | undefined {
  return RECORDS_TABLE_PRESET_REGISTRY[preset as RecordsTablePresetId]
}

export function getRecordsTablePresetRange(
  preset: RecordsTablePresetId,
  today: Date = new Date()
): { dateFrom: string; dateTo: string } | null {
  const def = RECORDS_TABLE_PRESET_REGISTRY[preset]
  if (def.kind !== "dateRange") return null
  return def.range(getRecordsTablePresetDateContext(today))
}

export function isRecordsTablePresetActive(
  preset: string,
  state: RecordsTablePresetState,
  today: Date = new Date()
): boolean {
  const def = getPresetDef(preset)
  if (!def) return false
  if (def.kind === "boolean") return def.isActive(state)
  return def.isActive(state, getRecordsTablePresetDateContext(today))
}

export function getRecordsTablePresetToggle(
  preset: string,
  state: RecordsTablePresetState,
  today: Date = new Date()
): RecordsTablePresetToggleResult | null {
  const def = getPresetDef(preset)
  if (!def) return null

  const active = isRecordsTablePresetActive(preset, state, today)

  if (def.kind === "dateRange") {
    if (active) return { action: "clearDateRange" }
    const range = def.range(getRecordsTablePresetDateContext(today))
    return {
      action: "setDateRange",
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    }
  }

  return {
    action: def.toggleAction,
    value: def.toggleValue(active),
  }
}
