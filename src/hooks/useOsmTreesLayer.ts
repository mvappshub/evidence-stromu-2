'use client'

import { useEffect, useRef } from 'react'
import { ensureOsmTreesLayer, setOsmTreesData, setOsmTreesVisibility } from '@/lib/map-osm-trees-layer'
import { useMapLayerStore } from '@/store/useMapLayerStore'
import { useMapContext } from '@/components/map/MapContext'
import { runWhenStyleReady } from '@/lib/map-style-ready'

const MAX_BBOX_SPAN = 0.25

export function useOsmTreesLayer(layersEpoch: number) {
  const { map } = useMapContext()
  const osmTreesVisible = useMapLayerStore((s) => s.osmTreesVisible)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!map) return

    let cancelled = false
    let offMoveEnd: (() => void) | undefined

    runWhenStyleReady(map, () => {
      if (cancelled) return

      ensureOsmTreesLayer(map)
      setOsmTreesVisibility(map, osmTreesVisible)

      if (!osmTreesVisible) {
        setOsmTreesData(map, { type: 'FeatureCollection', features: [] })
        return
      }

      const loadTrees = () => {
        const bounds = map.getBounds()
        const west = bounds.getWest()
        const south = bounds.getSouth()
        const east = bounds.getEast()
        const north = bounds.getNorth()
        if (east - west > MAX_BBOX_SPAN || north - south > MAX_BBOX_SPAN) return

        abortRef.current?.abort()
        abortRef.current = new AbortController()

        const qs = new URLSearchParams({
          minLng: String(west),
          minLat: String(south),
          maxLng: String(east),
          maxLat: String(north),
        })

        fetch(`/api/map/osm-trees?${qs}`, { signal: abortRef.current.signal })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!data || cancelled) return
            setOsmTreesData(map, data)
          })
          .catch(() => undefined)
      }

      const onMoveEnd = () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(loadTrees, 500)
      }

      loadTrees()
      map.on('moveend', onMoveEnd)
      offMoveEnd = () => map.off('moveend', onMoveEnd)
    })

    return () => {
      cancelled = true
      offMoveEnd?.()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [map, osmTreesVisible, layersEpoch])
}
