'use client'

import type maplibregl from 'maplibre-gl'
import { usePlantStore } from '@/store/usePlantStore'
import type { GeoJsonResponse } from '@/hooks/useMapGeoJson'
import { useMapMeasure } from '@/hooks/useMapMeasure'
import { useMapLinePlace } from '@/hooks/useMapLinePlace'
import { useMapCursor } from '@/hooks/useMapCursor'
import { useMapKeyboardShortcuts } from '@/hooks/useMapKeyboardShortcuts'
import { useMapSelection } from '@/hooks/useMapSelection'

export function useMapInteractions(
  map: maplibregl.Map | null,
  layersEpoch: number,
  geoData: GeoJsonResponse | undefined,
  createMutateRef: React.RefObject<((args: { lat: number; lng: number }) => void) | undefined>,
  measureMode: boolean,
  linePlaceMode: boolean,
  applyMeasureRef: React.MutableRefObject<(map: maplibregl.Map) => void>,
  applyLinePlaceRef: React.MutableRefObject<(map: maplibregl.Map) => void>
) {
  const lastInsertedRecordNumber = usePlantStore((s) => s.lastInsertedRecordNumber)
  const setLastInsertedRecordNumber = usePlantStore((s) => s.setLastInsertedRecordNumber)
  const { measurePoints, setMeasurePoints, totalMeasureDistance, clearMeasurePoints } =
    useMapMeasure(map, layersEpoch, applyMeasureRef)
  useMapLinePlace(map, layersEpoch, applyLinePlaceRef)
  const { cursorCoord } = useMapCursor(map)
  const { gridVisible } = useMapKeyboardShortcuts({
    lastInsertedRecordNumber,
    setLastInsertedRecordNumber,
  })
  const { placeModeRef, flashMarkers, selectedTreeInfo } = useMapSelection({
    map,
    geoData,
    createMutateRef,
    measureMode,
    linePlaceMode,
    setMeasurePoints,
  })

  return {
    placeModeRef,
    measurePoints,
    totalMeasureDistance,
    clearMeasurePoints,
    cursorCoord,
    gridVisible,
    flashMarkers,
    selectedTreeInfo,
  }
}
