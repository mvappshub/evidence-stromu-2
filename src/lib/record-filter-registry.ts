import type { Prisma } from "@prisma/client"
import type {
  RecordsFilterParams,
  UiRecordFilters,
} from "@/lib/records-filter-definition"
import { parseInputDate } from "@/lib/server-date"

export type RecordFilterKind = "string" | "date" | "boolean"

export type RecordFilterRegistryEntry = {
  apiKey: keyof RecordsFilterParams
  queryParam: string
  uiKey: keyof UiRecordFilters
  kind: RecordFilterKind
  printLabel: string | ((value: string) => string)
  parseInto: (
    filters: RecordsFilterParams,
    searchParams: URLSearchParams
  ) => void
  normalizeFromUi: (filters: RecordsFilterParams, ui: UiRecordFilters) => void
  serialize: (filters: RecordsFilterParams, params: URLSearchParams) => void
  applyToWhere: (
    where: Prisma.TreeRecordWhereInput,
    filters: RecordsFilterParams
  ) => void
}

export function createInactiveFilterParams(): RecordsFilterParams {
  return {
    search: null,
    species: null,
    locality: null,
    dateFrom: null,
    dateTo: null,
    hasNote: false,
    noReminder: false,
  }
}

function emptyStringToNull(value: string | null | undefined): string | null {
  return value && String(value).length > 0 ? String(value) : null
}

function applyPlantedAtDateFilter(
  where: Prisma.TreeRecordWhereInput,
  filters: RecordsFilterParams
): void {
  const { dateFrom, dateTo } = filters
  if (!dateFrom && !dateTo) return

  const from = dateFrom ? parseInputDate(dateFrom) : null
  const to = dateTo ? parseInputDate(dateTo) : null

  where.plantedAt = {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  }
}

function stringSpec(
  apiKey: "search" | "species" | "locality",
  queryParam: string,
  uiKey: "searchQuery" | "filterSpecies" | "filterLocality",
  printLabel: string | ((value: string) => string),
  applyToWhere: RecordFilterRegistryEntry["applyToWhere"]
): RecordFilterRegistryEntry {
  return {
    apiKey,
    queryParam,
    uiKey,
    kind: "string",
    printLabel,
    parseInto(filters, searchParams) {
      filters[apiKey] = searchParams.get(queryParam)
    },
    normalizeFromUi(filters, ui) {
      filters[apiKey] = emptyStringToNull(ui[uiKey] as string)
    },
    serialize(filters, params) {
      const value = filters[apiKey]
      if (value) params.set(queryParam, value)
    },
    applyToWhere,
  }
}

function booleanSpec(
  apiKey: "hasNote" | "noReminder",
  queryParam: string,
  uiKey: "hasNoteFilter" | "noReminderFilter",
  printLabel: string,
  applyToWhere: RecordFilterRegistryEntry["applyToWhere"]
): RecordFilterRegistryEntry {
  return {
    apiKey,
    queryParam,
    uiKey,
    kind: "boolean",
    printLabel,
    parseInto(filters, searchParams) {
      filters[apiKey] = searchParams.get(queryParam) === "true"
    },
    normalizeFromUi(filters, ui) {
      filters[apiKey] = ui[uiKey] as boolean
    },
    serialize(filters, params) {
      if (filters[apiKey]) params.set(queryParam, "true")
    },
    applyToWhere,
  }
}

function dateSpec(
  apiKey: "dateFrom" | "dateTo",
  queryParam: string,
  uiKey: "dateFrom" | "dateTo",
  printLabel: (value: string) => string
): RecordFilterRegistryEntry {
  return {
    apiKey,
    queryParam,
    uiKey,
    kind: "date",
    printLabel,
    parseInto(filters, searchParams) {
      filters[apiKey] = searchParams.get(queryParam)
    },
    normalizeFromUi(filters, ui) {
      filters[apiKey] = emptyStringToNull(ui[uiKey] as string | null)
    },
    serialize(filters, params) {
      const value = filters[apiKey]
      if (value) params.set(queryParam, value)
    },
    applyToWhere: applyPlantedAtDateFilter,
  }
}

export const RECORD_FILTER_REGISTRY: RecordFilterRegistryEntry[] = [
  stringSpec("search", "search", "searchQuery", (value) => `Hledání: "${value}"`, (where, filters) => {
    const search = filters.search
    if (!search) return
    where.OR = [
      { speciesLatin: { contains: search } },
      { locality: { contains: search } },
      { note: { contains: search } },
    ]
  }),
  stringSpec("species", "species", "filterSpecies", (value) => `Druh: ${value}`, (where, filters) => {
    const species = filters.species
    if (!species) return
    where.speciesLatin = species
  }),
  stringSpec(
    "locality",
    "locality",
    "filterLocality",
    (value) => `Lokalita: ${value}`,
    (where, filters) => {
      const locality = filters.locality
      if (!locality) return
      where.locality = { contains: locality }
    }
  ),
  dateSpec("dateFrom", "dateFrom", "dateFrom", (value) => `Od: ${value}`),
  dateSpec("dateTo", "dateTo", "dateTo", (value) => `Do: ${value}`),
  booleanSpec("hasNote", "hasNote", "hasNoteFilter", "S poznámkou", (where, filters) => {
    if (!filters.hasNote) return
    where.note = { not: null }
  }),
  booleanSpec("noReminder", "noReminder", "noReminderFilter", "Bez připomínky", (where, filters) => {
    if (!filters.noReminder) return
    where.reminders = { none: {} }
  }),
]

/** Metadata slice for UI helpers (labels, hasActive). */
export const RECORD_FILTER_SPECS = RECORD_FILTER_REGISTRY.map(
  ({ apiKey, queryParam, uiKey, kind, printLabel }) => ({
    apiKey,
    queryParam,
    uiKey,
    kind,
    printLabel,
  })
)
