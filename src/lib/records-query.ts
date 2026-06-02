import type { Prisma } from "@prisma/client"

export interface RecordsFilterParams {
  search?: string | null
  species?: string | null
  locality?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  hasNote?: boolean
  noReminder?: boolean
}

/** Parse filter query params from a URLSearchParams or Request URL. */
export function parseRecordsFilterParams(
  searchParams: URLSearchParams
): RecordsFilterParams {
  return {
    search: searchParams.get("search"),
    species: searchParams.get("species"),
    locality: searchParams.get("locality"),
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
    hasNote: searchParams.get("hasNote") === "true",
    noReminder: searchParams.get("noReminder") === "true",
  }
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
    where.plantedAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
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
  if (filters.search) params.set("search", filters.search)
  if (filters.species) params.set("species", filters.species)
  if (filters.locality) params.set("locality", filters.locality)
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
  if (filters.dateTo) params.set("dateTo", filters.dateTo)
  if (filters.hasNote) params.set("hasNote", "true")
  if (filters.noReminder) params.set("noReminder", "true")
  return params
}
