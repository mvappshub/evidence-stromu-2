/**
 * Single source of truth for record list filters (API query params, UI state, Prisma where).
 * Add a new filter here, then wire applyRecordsFilterToWhere + tests.
 */

export const RECORD_FILTER_SPECS = [
  {
    apiKey: "search",
    queryParam: "search",
    uiKey: "searchQuery",
    kind: "string",
    printLabel: (value: string) => `Hledání: "${value}"`,
  },
  {
    apiKey: "species",
    queryParam: "species",
    uiKey: "filterSpecies",
    kind: "string",
    printLabel: (value: string) => `Druh: ${value}`,
  },
  {
    apiKey: "locality",
    queryParam: "locality",
    uiKey: "filterLocality",
    kind: "string",
    printLabel: (value: string) => `Lokalita: ${value}`,
  },
  {
    apiKey: "dateFrom",
    queryParam: "dateFrom",
    uiKey: "dateFrom",
    kind: "date",
    printLabel: (value: string) => `Od: ${value}`,
  },
  {
    apiKey: "dateTo",
    queryParam: "dateTo",
    uiKey: "dateTo",
    kind: "date",
    printLabel: (value: string) => `Do: ${value}`,
  },
  {
    apiKey: "hasNote",
    queryParam: "hasNote",
    uiKey: "hasNoteFilter",
    kind: "boolean",
    printLabel: "S poznámkou",
  },
  {
    apiKey: "noReminder",
    queryParam: "noReminder",
    uiKey: "noReminderFilter",
    kind: "boolean",
    printLabel: "Bez připomínky",
  },
] as const

export type RecordFilterApiKey = (typeof RECORD_FILTER_SPECS)[number]["apiKey"]
export type RecordFilterUiKey = (typeof RECORD_FILTER_SPECS)[number]["uiKey"]

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
