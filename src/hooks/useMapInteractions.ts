'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type maplibregl from 'maplibre-gl'
import { format } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { haversineDistance } from '@/lib/haversine'
import {
  MEASURE_LINE_LAYER_ID,
  MEASURE_POINTS_LAYER_ID,
  MEASURE_SOURCE_ID,
} from '@/lib/map-layer-ids'
import { useUiStore } from '@/store/useUiStore'
import { usePlantStore } from '@/store/usePlantStore'
import type { GeoJsonResponse } from '@/hooks/useMapGeoJson'

function queryLayersIfPresent(
  map: maplibregl.Map,
  point: maplibregl.PointLike,
  layerIds: string[]
): maplibregl.MapGeoJSONFeature[] {
  const existing = layerIds.filter((id) => map.getLayer(id))
  if (existing.length === 0) return []
  return map.queryRenderedFeatures(point, { layers: existing })
}

export function useMapInteractions(
  map: maplibregl.Map | null,
  layersEpoch: number,
  geoData: GeoJsonResponse | undefined,
  createMutateRef: React.RefObject<((args: { lat: number; lng: number }) => void) | undefined>,
  measureMode: boolean,
  applyMeasureRef: React.MutableRefObject<(map: maplibregl.Map) => void>
) {
  const queryClient = useQueryClient()
  const selectedRecordNumber = useUiStore((s) => s.selectedRecordNumber)
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const placeMode = usePlantStore((s) => s.placeMode)
  const lastInsertedRecordNumber = usePlantStore((s) => s.lastInsertedRecordNumber)
  const setLastInsertedRecordNumber = usePlantStore((s) => s.setLastInsertedRecordNumber)

  const placeModeRef = useRef(placeMode)
  const measureModeRef = useRef(measureMode)
  useEffect(() => {
    placeModeRef.current = placeMode
  }, [placeMode])
  useEffect(() => {
    measureModeRef.current = measureMode
  }, [measureMode])

  const [measurePoints, setMeasurePoints] = useState<Array<{ lat: number; lng: number }>>([])
  const [cursorCoord, setCursorCoord] = useState<{ lat: number; lng: number } | null>(null)
  const [gridVisible, setGridVisible] = useState(false)
  const [flashMarkers, setFlashMarkers] = useState<Array<{ id: number; x: number; y: number }>>([])

  const cursorCoordFrameRef = useRef<number | null>(null)
  const pendingCursorCoordRef = useRef<{ lat: number; lng: number } | null>(null)
  const lastCursorCoordKeyRef = useRef<string | null>(null)

  const totalMeasureDistance = useMemo(() => {
    let total = 0
    for (let i = 1; i < measurePoints.length; i++) {
      total += haversineDistance(
        measurePoints[i - 1].lat,
        measurePoints[i - 1].lng,
        measurePoints[i].lat,
        measurePoints[i].lng
      )
    }
    return total
  }, [measurePoints])

  const clearMeasurePoints = useCallback(() => setMeasurePoints([]), [])

  const addFlashMarker = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random()
    setFlashMarkers((prev) => [...prev, { id, x, y }])
    setTimeout(() => {
      setFlashMarkers((prev) => prev.filter((m) => m.id !== id))
    }, 900)
  }, [])

  const applyMeasureToMap = useCallback(
    (m: maplibregl.Map) => {
      const hasSource = !!m.getSource(MEASURE_SOURCE_ID)
      if (!hasSource) return

      if (m.getLayer(MEASURE_LINE_LAYER_ID)) {
        m.setLayoutProperty(MEASURE_LINE_LAYER_ID, 'visibility', 'visible')
      }
      if (m.getLayer(MEASURE_POINTS_LAYER_ID)) {
        m.setLayoutProperty(MEASURE_POINTS_LAYER_ID, 'visibility', 'visible')
      }

      const features: GeoJSON.Feature[] = measurePoints.map((pt, idx) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
        properties: { measurePoint: true, index: idx },
      }))
      if (measurePoints.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: measurePoints.map((pt) => [pt.lng, pt.lat]),
          },
          properties: { measureLine: true },
        })
      }
      ;(m.getSource(MEASURE_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features,
      })
    },
    [measurePoints]
  )

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
        const rn = treeHits[0].properties?.recordNumber
        if (rn != null) setSelectedRecordNumber(Number(rn))
      } else {
        setSelectedRecordNumber(null)
      }
    }

    map.on('click', handleMapClick)
    return () => {
      map.off('click', handleMapClick)
    }
  }, [map, addFlashMarker, createMutateRef, setSelectedRecordNumber])

  useEffect(() => {
    if (!map) return
    map.getCanvas().style.cursor =
      placeMode || measureMode ? 'crosshair' : ''
  }, [map, placeMode, measureMode])

  useEffect(() => {
    if (!map) return

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      pendingCursorCoordRef.current = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      if (cursorCoordFrameRef.current !== null) return
      cursorCoordFrameRef.current = window.requestAnimationFrame(() => {
        cursorCoordFrameRef.current = null
        const coord = pendingCursorCoordRef.current
        if (!coord) return
        const key = `${coord.lat.toFixed(4)},${coord.lng.toFixed(4)}`
        if (key === lastCursorCoordKeyRef.current) return
        lastCursorCoordKeyRef.current = key
        setCursorCoord(coord)
      })
    }
    const onMouseOut = () => {
      pendingCursorCoordRef.current = null
      lastCursorCoordKeyRef.current = null
      if (cursorCoordFrameRef.current !== null) {
        window.cancelAnimationFrame(cursorCoordFrameRef.current)
        cursorCoordFrameRef.current = null
      }
      setCursorCoord(null)
    }

    map.on('mousemove', onMouseMove)
    map.on('mouseout', onMouseOut)
    return () => {
      if (cursorCoordFrameRef.current !== null) {
        window.cancelAnimationFrame(cursorCoordFrameRef.current)
      }
      map.off('mousemove', onMouseMove)
      map.off('mouseout', onMouseOut)
    }
  }, [map])

  useEffect(() => {
    applyMeasureRef.current = applyMeasureToMap
  }, [applyMeasureToMap, applyMeasureRef])

  useEffect(() => {
    if (!map) return
    applyMeasureToMap(map)
  }, [map, layersEpoch, measurePoints, applyMeasureToMap])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 'z' &&
        lastInsertedRecordNumber != null
      ) {
        e.preventDefault()
        fetch(`/api/records/${lastInsertedRecordNumber}`, { method: 'DELETE' }).then(() => {
          setLastInsertedRecordNumber(null)
          queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
          queryClient.invalidateQueries({ queryKey: ['records'] })
        })
      }
      if (
        e.key === 'g' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        setGridVisible((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lastInsertedRecordNumber, setLastInsertedRecordNumber, queryClient])

  const selectedTreeInfo = useMemo(() => {
    if (selectedRecordNumber == null || !geoData?.features) return null
    const feature = geoData.features.find(
      (f) => f.properties.recordNumber === selectedRecordNumber
    )
    if (!feature) return null
    return {
      species: feature.properties.speciesLatin,
      date: feature.properties.plantedAt
        ? format(new Date(feature.properties.plantedAt), 'd.M.yyyy')
        : '',
      locality: feature.properties.locality,
      recordNumber: feature.properties.recordNumber,
    }
  }, [selectedRecordNumber, geoData])

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
