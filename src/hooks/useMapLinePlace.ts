'use client'

import { useCallback, useEffect } from 'react'
import type maplibregl from 'maplibre-gl'
import {
  LINE_PLACE_LINE_LAYER_ID,
  LINE_PLACE_PREVIEW_LAYER_ID,
  LINE_PLACE_SOURCE_ID,
  LINE_PLACE_VERTEX_LAYER_ID,
} from '@/lib/map-layer-ids'
import { usePlantStore } from '@/store/usePlantStore'

export function useMapLinePlace(
  map: maplibregl.Map | null,
  layersEpoch: number,
  applyLinePlaceRef: React.MutableRefObject<(map: maplibregl.Map) => void>
) {
  const linePlaceMode = usePlantStore((s) => s.linePlaceMode)
  const vertices = usePlantStore((s) => s.linePlaceVertices)
  const previewPoints = usePlantStore((s) => s.linePlacePreview)

  const applyLinePlaceToMap = useCallback(
    (m: maplibregl.Map) => {
      const hasSource = !!m.getSource(LINE_PLACE_SOURCE_ID)
      if (!hasSource) return

      const show =
        linePlaceMode && (vertices.length > 0 || (previewPoints?.length ?? 0) > 0)

      for (const id of [
        LINE_PLACE_LINE_LAYER_ID,
        LINE_PLACE_VERTEX_LAYER_ID,
        LINE_PLACE_PREVIEW_LAYER_ID,
      ]) {
        if (m.getLayer(id)) {
          m.setLayoutProperty(id, 'visibility', show ? 'visible' : 'none')
        }
      }

      if (!show) {
        ;(m.getSource(LINE_PLACE_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        })
        return
      }

      const features: GeoJSON.Feature[] = []

      if (previewPoints && previewPoints.length > 0) {
        for (const pt of previewPoints) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
            properties: { kind: 'preview' },
          })
        }
        if (vertices.length >= 2) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: vertices.map((v) => [v.lng, v.lat]),
            },
            properties: { kind: 'line' },
          })
        }
      } else {
        for (const pt of vertices) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
            properties: { kind: 'vertex' },
          })
        }
        if (vertices.length >= 2) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: vertices.map((v) => [v.lng, v.lat]),
            },
            properties: { kind: 'line' },
          })
        }
      }

      ;(m.getSource(LINE_PLACE_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features,
      })
    },
    [linePlaceMode, vertices, previewPoints]
  )

  useEffect(() => {
    applyLinePlaceRef.current = applyLinePlaceToMap
  }, [applyLinePlaceToMap, applyLinePlaceRef])

  useEffect(() => {
    if (!map) return
    applyLinePlaceToMap(map)
  }, [map, layersEpoch, applyLinePlaceToMap])
}
