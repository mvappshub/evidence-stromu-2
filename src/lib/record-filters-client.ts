import {
  RECORD_FILTER_SPECS,
  type RecordsFilterParams,
  type UiRecordFilters,
} from "@/lib/records-filter-definition"
import { recordsFilterParamsToSearchParams } from "@/lib/records-query"

export type { UiRecordFilters } from "@/lib/records-filter-definition"

export function hasActiveRecordFilters(ui: UiRecordFilters): boolean {
  return RECORD_FILTER_SPECS.some((spec) => {
    const value = ui[spec.uiKey]
    if (spec.kind === "boolean") return value === true
    return Boolean(value)
  })
}

export function uiFiltersToRecordsParams(
  ui: UiRecordFilters
): RecordsFilterParams {
  const params: RecordsFilterParams = {}

  for (const spec of RECORD_FILTER_SPECS) {
    const uiValue = ui[spec.uiKey]
    if (spec.kind === "boolean") {
      if (spec.apiKey === "hasNote") params.hasNote = ui.hasNoteFilter
      if (spec.apiKey === "noReminder") params.noReminder = ui.noReminderFilter
      continue
    }
    const stringValue = uiValue as string | null
    const normalized =
      stringValue && String(stringValue).length > 0 ? stringValue : null
    if (spec.apiKey === "search") params.search = normalized
    if (spec.apiKey === "species") params.species = normalized
    if (spec.apiKey === "locality") params.locality = normalized
    if (spec.apiKey === "dateFrom") params.dateFrom = normalized
    if (spec.apiKey === "dateTo") params.dateTo = normalized
  }

  return params
}

/** Build query string for /api/records*, export, geojson from UI filter state. */
export function recordFiltersToQueryString(
  ui: UiRecordFilters,
  extra?: Record<string, string | undefined>
): string {
  const params = recordsFilterParamsToSearchParams(uiFiltersToRecordsParams(ui))
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined) params.set(key, value)
    }
  }
  return params.toString()
}

/** Human-readable active filter labels for print report. */
export function formatActiveRecordFilterLabels(ui: UiRecordFilters): string[] {
  const labels: string[] = []

  for (const spec of RECORD_FILTER_SPECS) {
    const uiValue = ui[spec.uiKey]
    if (spec.kind === "boolean") {
      if (uiValue) labels.push(spec.printLabel)
      continue
    }
    if (uiValue) labels.push(spec.printLabel(String(uiValue)))
  }

  return labels
}
