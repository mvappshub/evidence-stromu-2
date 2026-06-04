'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUiStore } from '@/store/useUiStore'
import { recordFiltersToQueryString } from '@/lib/record-filters-client'
import type { TreeMapGeoJsonCollection } from '@/lib/tree-map-geojson'

export type { TreeMapGeoJsonCollection as GeoJsonResponse } from '@/lib/tree-map-geojson'
export type {
  TreeMapGeoJsonFeature as GeoJsonFeature,
  TreeMapGeoJsonCollection,
} from '@/lib/tree-map-geojson'

/** Shared GeoJSON query — same filters as RecordsTable / export. */
export function useMapGeoJson() {
  const searchQuery = useUiStore((s) => s.searchQuery)
  const filterSpecies = useUiStore((s) => s.filterSpecies)
  const filterLocality = useUiStore((s) => s.filterLocality)
  const dateFrom = useUiStore((s) => s.dateFrom)
  const dateTo = useUiStore((s) => s.dateTo)
  const hasNoteFilter = useUiStore((s) => s.hasNoteFilter)
  const noReminderFilter = useUiStore((s) => s.noReminderFilter)

  const queryString = useMemo(() => {
    return recordFiltersToQueryString({
      searchQuery,
      filterSpecies,
      filterLocality,
      dateFrom,
      dateTo,
      hasNoteFilter,
      noReminderFilter,
    })
  }, [
    searchQuery,
    filterSpecies,
    filterLocality,
    dateFrom,
    dateTo,
    hasNoteFilter,
    noReminderFilter,
  ])

  return useQuery<TreeMapGeoJsonCollection>({
    queryKey: ['records-geojson', queryString],
    queryFn: async () => {
      const res = await fetch(`/api/records/geojson?${queryString}`)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `geojson ${res.status}`)
      }
      return res.json()
    },
  })
}
