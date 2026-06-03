/**
 * Types for record list filters (API query params, UI state, Prisma where).
 * Registry + handlers: @/lib/record-filter-registry
 */

export type RecordFilterApiKey =
  | "search"
  | "species"
  | "locality"
  | "dateFrom"
  | "dateTo"
  | "hasNote"
  | "noReminder"

export type RecordFilterUiKey =
  | "searchQuery"
  | "filterSpecies"
  | "filterLocality"
  | "dateFrom"
  | "dateTo"
  | "hasNoteFilter"
  | "noReminderFilter"

/** UI filter state (table, map, export, print). */
export interface UiRecordFilters {
  searchQuery: string
  filterSpecies: string
  filterLocality: string
  dateFrom: string | null
  dateTo: string | null
  hasNoteFilter: boolean
  noReminderFilter: boolean
}

export interface RecordsFilterParams {
  search?: string | null
  species?: string | null
  locality?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  hasNote?: boolean
  noReminder?: boolean
}
