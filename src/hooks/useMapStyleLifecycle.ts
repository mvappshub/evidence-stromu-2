'use client'

import { useCallback, useState } from 'react'
import type maplibregl from 'maplibre-gl'
import { getMapStyle, type MapStyleKey } from '@/lib/map-basemaps'
import type { LayerMode } from '@/components/map/HeatmapToggle'
import { restoreMapLayers } from '@/lib/map-layer-restore'
import { getRestoreContextFromStore } from '@/store/useMapLayerStore'

export function useMapStyleLifecycle(
  mapRef: React.RefObject<maplibregl.Map | null>,
  layerMode: LayerMode,
  setLayerMode: (mode: LayerMode) => void,
  updateMapSourceRef: React.RefObject<(map: maplibregl.Map) => void>,
  onLayersRestored: () => void
) {
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('osm')

  const handleStyleChange = useCallback(
    (style: MapStyleKey) => {
      setMapStyle(style)
      const map = mapRef.current
      if (!map) return

      map.setStyle(getMapStyle(style) as unknown as maplibregl.StyleSpecification)
      map.once('style.load', () => {
        restoreMapLayers(map, getRestoreContextFromStore(style, layerMode), () => {
          updateMapSourceRef.current(map)
          onLayersRestored()
        })
      })
    },
    [mapRef, layerMode, updateMapSourceRef, onLayersRestored]
  )

  return { mapStyle, handleStyleChange }
}
