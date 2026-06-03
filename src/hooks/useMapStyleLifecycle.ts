'use client'

import { useCallback, useState } from 'react'
import type maplibregl from 'maplibre-gl'
import { getMapStyle, type MapStyleKey } from '@/lib/map-basemaps'

export type SavedMapCamera = {
  center: maplibregl.LngLatLike
  zoom: number
  bearing: number
  pitch: number
}

export function useMapStyleLifecycle(
  mapRef: React.RefObject<maplibregl.Map | null>,
  mapStyleRef: React.MutableRefObject<MapStyleKey>,
  pendingCameraRef: React.MutableRefObject<SavedMapCamera | null>
) {
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('osm')

  const handleStyleChange = useCallback(
    (style: MapStyleKey) => {
      setMapStyle(style)
      mapStyleRef.current = style

      const map = mapRef.current
      if (!map) return

      pendingCameraRef.current = {
        center: map.getCenter(),
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      }

      map.setStyle(getMapStyle(style) as unknown as maplibregl.StyleSpecification)
      // Vrstvy + data obnoví useMapInit na style.load
    },
    [mapRef, mapStyleRef, pendingCameraRef]
  )

  return { mapStyle, handleStyleChange }
}
