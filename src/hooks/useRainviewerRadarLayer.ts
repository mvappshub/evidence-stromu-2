'use client'

import { useEffect } from 'react'
import { ensureRadarLayer, setRadarVisibility } from '@/lib/map-radar-layer'
import { fetchRadarTileUrl } from '@/lib/rainviewer-radar-cache'
import { useMapLayerStore } from '@/store/useMapLayerStore'
import { useMapContext } from '@/components/map/MapContext'
import { runWhenStyleReady } from '@/lib/map-style-ready'

export function useRainviewerRadarLayer(layersEpoch: number) {
  const { map } = useMapContext()
  const radarVisible = useMapLayerStore((s) => s.radarVisible)

  useEffect(() => {
    if (!map) return

    let cancelled = false

    runWhenStyleReady(map, () => {
      if (cancelled) return

      if (!radarVisible) {
        setRadarVisibility(map, false)
        return
      }

      void fetchRadarTileUrl().then((tileUrl) => {
        if (cancelled || !tileUrl) {
          if (!cancelled) setRadarVisibility(map, false)
          return
        }
        ensureRadarLayer(map, tileUrl)
        setRadarVisibility(map, true)
      })
    })

    return () => {
      cancelled = true
    }
  }, [map, radarVisible, layersEpoch])
}
