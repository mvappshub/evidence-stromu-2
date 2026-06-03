import type {
  RecordsFilterParams,
  UiRecordFilters,
} from "@/lib/records-filter-definition"
import {
  createInactiveFilterParams,
  RECORD_FILTER_REGISTRY,
  RECORD_FILTER_SPECS,
} from "@/lib/record-filter-registry"
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
  const params = createInactiveFilterParams()

  for (const spec of RECORD_FILTER_REGISTRY) {
    spec.normalizeFromUi(params, ui)
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
      if (uiValue) labels.push(spec.printLabel as string)
      continue
    }
    if (uiValue) {
      const label = spec.printLabel
      labels.push(typeof label === "string" ? label : label(String(uiValue)))
    }
  }

  return labels
}
