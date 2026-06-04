'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type maplibregl from 'maplibre-gl'
import { format } from 'date-fns'
import { useUiStore } from '@/store/useUiStore'
import { usePlantStore } from '@/store/usePlantStore'
import type { GeoJsonResponse } from '@/hooks/useMapGeoJson'
import { readTreeMapFeatureProperties } from '@/lib/tree-map-geojson'

function queryLayersIfPresent(
  map: maplibregl.Map,
  point: maplibregl.PointLike,
  layerIds: string[]
): maplibregl.MapGeoJSONFeature[] {
  const existing = layerIds.filter((id) => map.getLayer(id))
  if (existing.length === 0) return []
  return map.queryRenderedFeatures(point, { layers: existing })
}

type UseMapSelectionArgs = {
  map: maplibregl.Map | null
  geoData: GeoJsonResponse | undefined
  createMutateRef: React.RefObject<((args: { lat: number; lng: number }) => void) | undefined>
  measureMode: boolean
  setMeasurePoints: React.Dispatch<React.SetStateAction<Array<{ lat: number; lng: number }>>>
}

export function useMapSelection({
  map,
  geoData,
  createMutateRef,
  measureMode,
  setMeasurePoints,
}: UseMapSelectionArgs) {
  const selectedRecordNumber = useUiStore((s) => s.selectedRecordNumber)
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const placeMode = usePlantStore((s) => s.placeMode)
  const placeModeRef = useRef(placeMode)
  const measureModeRef = useRef(measureMode)
  const [flashMarkers, setFlashMarkers] = useState<Array<{ id: number; x: number; y: number }>>([])

  useEffect(() => {
    placeModeRef.current = placeMode
  }, [placeMode])

  useEffect(() => {
    measureModeRef.current = measureMode
  }, [measureMode])

  const addFlashMarker = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random()
    setFlashMarkers((prev) => [...prev, { id, x, y }])
    setTimeout(() => {
      setFlashMarkers((prev) => prev.filter((m) => m.id !== id))
    }, 900)
  }, [])

  useEffect(() => {
    if (!map) return

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (placeModeRef.current) {
        addFlashMarker(e.point.x, e.point.y)
        createMutateRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng })
        return
      }
      if (measureModeRef.current) {
        setMeasurePoints((prev) => [...prev, { lat: e.lngLat.lat, lng: e.lngLat.lng }])
        return
      }

      const treeHits = queryLayersIfPresent(map, e.point, [
        'trees-layer',
        'selected-tree-layer',
      ])
      if (treeHits.length > 0) {
        const rn = readTreeMapFeatureProperties(treeHits[0].properties)?.recordNumber
        if (rn != null) setSelectedRecordNumber(rn)
      } else {
        setSelectedRecordNumber(null)
      }
    }

    map.on('click', handleMapClick)
    return () => {
      map.off('click', handleMapClick)
    }
  }, [map, addFlashMarker, createMutateRef, setMeasurePoints, setSelectedRecordNumber])

  useEffect(() => {
    if (!map) return
    map.getCanvas().style.cursor =
      placeMode || measureMode ? 'crosshair' : ''
  }, [map, placeMode, measureMode])

  const selectedTreeInfo = useMemo(() => {
    if (selectedRecordNumber == null || !geoData?.features) return null
    const feature = geoData.features.find(
      (f) =>
        readTreeMapFeatureProperties(f.properties)?.recordNumber ===
        selectedRecordNumber
    )
    if (!feature) return null
    const props = readTreeMapFeatureProperties(feature.properties)
    if (!props) return null
    return {
      species: props.speciesLatin,
      date: props.plantedAt
        ? format(new Date(props.plantedAt), 'd.M.yyyy')
        : '',
      locality: props.locality,
      recordNumber: props.recordNumber,
    }
  }, [selectedRecordNumber, geoData])

  return {
    placeModeRef,
    flashMarkers,
    selectedTreeInfo,
  }
}
