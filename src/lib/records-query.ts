import type { Prisma } from "@prisma/client"
import type { RecordsFilterParams } from "@/lib/records-filter-definition"
import {
  createInactiveFilterParams,
  RECORD_FILTER_REGISTRY,
} from "@/lib/record-filter-registry"

export type { RecordsFilterParams } from "@/lib/records-filter-definition"

/** Parse filter query params from a URLSearchParams or Request URL. */
export function parseRecordsFilterParams(
  searchParams: URLSearchParams
): RecordsFilterParams {
  const filters = createInactiveFilterParams()

  for (const spec of RECORD_FILTER_REGISTRY) {
    spec.parseInto(filters, searchParams)
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

  for (const spec of RECORD_FILTER_REGISTRY) {
    spec.applyToWhere(where, filters)
  }

  return where
}

/** Serialize filters to URLSearchParams (for API fetch from client). */
export function recordsFilterParamsToSearchParams(
  filters: RecordsFilterParams
): URLSearchParams {
  const params = new URLSearchParams()

  for (const spec of RECORD_FILTER_REGISTRY) {
    spec.serialize(filters, params)
  }

  return params
}
