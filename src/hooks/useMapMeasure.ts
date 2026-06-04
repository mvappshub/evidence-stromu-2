'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type maplibregl from 'maplibre-gl'
import { haversineDistance } from '@/lib/haversine'
import {
  MEASURE_LINE_LAYER_ID,
  MEASURE_POINTS_LAYER_ID,
  MEASURE_SOURCE_ID,
} from '@/lib/map-layer-ids'

export function useMapMeasure(
  map: maplibregl.Map | null,
  layersEpoch: number,
  applyMeasureRef: React.MutableRefObject<(map: maplibregl.Map) => void>
) {
  const [measurePoints, setMeasurePoints] = useState<Array<{ lat: number; lng: number }>>([])

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
    applyMeasureRef.current = applyMeasureToMap
  }, [applyMeasureToMap, applyMeasureRef])

  useEffect(() => {
    if (!map) return
    applyMeasureToMap(map)
  }, [map, layersEpoch, measurePoints, applyMeasureToMap])

  return {
    measurePoints,
    setMeasurePoints,
    totalMeasureDistance,
    clearMeasurePoints,
  }
}
