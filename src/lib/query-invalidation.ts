import type { QueryClient } from "@tanstack/react-query"

type RecordsInvalidationOptions = {
  includeCount?: boolean
  includeFilters?: boolean
  includeStats?: boolean
  includeActivityLog?: boolean
  includeRecord?: number | null
}

export async function invalidateRecordsDomain(
  queryClient: QueryClient,
  options: RecordsInvalidationOptions = {}
) {
  const {
    includeCount = false,
    includeFilters = false,
    includeStats = false,
    includeActivityLog = false,
    includeRecord = null,
  } = options

  const invalidations: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: ["records"] }),
    queryClient.invalidateQueries({ queryKey: ["records-geojson"] }),
  ]

  if (includeCount) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: ["records-count"] }))
  }
  if (includeFilters) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: ["records-filters"] }))
  }
  if (includeStats) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: ["records-stats"] }))
  }
  if (includeActivityLog) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: ["activity-log"] }))
  }
  if (includeRecord != null) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ["record", includeRecord] })
    )
  }

  await Promise.all(invalidations)
}

export async function invalidateReminderDomain(queryClient: QueryClient) {
  await Promise.all([
    invalidateRecordsDomain(queryClient),
    queryClient.invalidateQueries({ queryKey: ["reminders-due"] }),
  ])
}
