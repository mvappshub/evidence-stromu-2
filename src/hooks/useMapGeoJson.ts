'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUiStore } from '@/store/useUiStore'
import { recordFiltersToQueryString } from '@/lib/record-filters-client'

export interface GeoJsonFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: {
    recordNumber: number
    speciesLatin: string
    plantedAt: string
    locality: string | null
  }
}

export interface GeoJsonResponse {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

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

  return useQuery<GeoJsonResponse>({
    queryKey: ['records-geojson', queryString],
    queryFn: async () => {
      const res = await fetch(`/api/records/geojson?${queryString}`)
      if (!res.ok) throw new Error('Failed to fetch geojson')
      return res.json()
    },
  })
}
