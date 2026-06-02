import type { RecordsFilterParams } from "@/lib/records-query"

/** Snapshot of UI filter state used by table, map, export, and print. */
export interface UiRecordFilters {
  searchQuery: string
  filterSpecies: string
  filterLocality: string
  dateFrom: string | null
  dateTo: string | null
  hasNoteFilter: boolean
  noReminderFilter: boolean
}

export function hasActiveRecordFilters(ui: UiRecordFilters): boolean {
  return Boolean(
    ui.searchQuery ||
      ui.filterSpecies ||
      ui.filterLocality ||
      ui.dateFrom ||
      ui.dateTo ||
      ui.hasNoteFilter ||
      ui.noReminderFilter
  )
}

export function uiFiltersToRecordsParams(
  ui: UiRecordFilters
): RecordsFilterParams {
  return {
    search: ui.searchQuery || null,
    species: ui.filterSpecies || null,
    locality: ui.filterLocality || null,
    dateFrom: ui.dateFrom,
    dateTo: ui.dateTo,
    hasNote: ui.hasNoteFilter,
    noReminder: ui.noReminderFilter,
  }
}
