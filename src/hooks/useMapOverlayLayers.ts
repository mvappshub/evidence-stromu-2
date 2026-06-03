'use client'

import { useEffect } from 'react'
import { syncWmsOverlays } from '@/lib/map-wms-runtime'
import { useMapLayerStore } from '@/store/useMapLayerStore'
import { useMapContext } from '@/components/map/MapContext'

export function useMapOverlayLayers() {
  const { map } = useMapContext()
  const overlayVisibility = useMapLayerStore((s) => s.overlayVisibility)

  useEffect(() => {
    if (!map) return
    syncWmsOverlays(map, overlayVisibility)
  }, [map, overlayVisibility])
}
