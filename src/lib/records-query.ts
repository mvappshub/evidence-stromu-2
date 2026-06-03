import type { Prisma } from "@prisma/client"
import {
  RECORD_FILTER_SPECS,
  type RecordsFilterParams,
} from "@/lib/records-filter-definition"
import { parseInputDate } from "@/lib/server-date"

export type { RecordsFilterParams } from "@/lib/records-filter-definition"

/** Parse filter query params from a URLSearchParams or Request URL. */
export function parseRecordsFilterParams(
  searchParams: URLSearchParams
): RecordsFilterParams {
  const filters: RecordsFilterParams = {}

  for (const spec of RECORD_FILTER_SPECS) {
    if (spec.kind === "boolean") {
      if (spec.apiKey === "hasNote") {
        filters.hasNote = searchParams.get(spec.queryParam) === "true"
      }
      if (spec.apiKey === "noReminder") {
        filters.noReminder = searchParams.get(spec.queryParam) === "true"
      }
      continue
    }
    const value = searchParams.get(spec.queryParam)
    if (spec.apiKey === "search") filters.search = value
    if (spec.apiKey === "species") filters.species = value
    if (spec.apiKey === "locality") filters.locality = value
    if (spec.apiKey === "dateFrom") filters.dateFrom = value
    if (spec.apiKey === "dateTo") filters.dateTo = value
  }

  return filters
}

/** Build Prisma where clause for tree records scoped to a user. */
export function buildRecordsWhere(
  userId: string,
  filters: RecordsFilterParams
): Prisma.TreeRecordWhereInput {
  const where: Prisma.TreeRecordWhereInput = {
    createdById: userId,
  }

  const { search, species, locality, dateFrom, dateTo, hasNote, noReminder } =
    filters

  if (species) {
    where.speciesLatin = species
  }
  if (locality) {
    where.locality = { contains: locality }
  }
  if (search) {
    where.OR = [
      { speciesLatin: { contains: search } },
      { locality: { contains: search } },
      { note: { contains: search } },
    ]
  }
  if (dateFrom || dateTo) {
    const from = dateFrom ? parseInputDate(dateFrom) : null
    const to = dateTo ? parseInputDate(dateTo) : null

    where.plantedAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    }
  }
  if (hasNote) {
    where.note = { not: null }
  }
  if (noReminder) {
    where.reminders = { none: {} }
  }

  return where
}

/** Serialize filters to URLSearchParams (for API fetch from client). */
export function recordsFilterParamsToSearchParams(
  filters: RecordsFilterParams
): URLSearchParams {
  const params = new URLSearchParams()

  for (const spec of RECORD_FILTER_SPECS) {
    if (spec.kind === "boolean") {
      if (spec.apiKey === "hasNote" && filters.hasNote) {
        params.set(spec.queryParam, "true")
      }
      if (spec.apiKey === "noReminder" && filters.noReminder) {
        params.set(spec.queryParam, "true")
      }
      continue
    }
    const value =
      spec.apiKey === "search"
        ? filters.search
        : spec.apiKey === "species"
          ? filters.species
          : spec.apiKey === "locality"
            ? filters.locality
            : spec.apiKey === "dateFrom"
              ? filters.dateFrom
              : filters.dateTo
    if (value) params.set(spec.queryParam, value)
  }

  return params
}
