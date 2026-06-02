'use client'

import { useSyncExternalStore } from 'react'
import { useUiStore } from '@/store/useUiStore'
import { useMapContextOptional } from '@/components/map/MapContext'

export function StatusBar() {
  const viewMode = useUiStore((s) => s.viewMode)
  const showZoom = viewMode === 'map' || viewMode === 'both'

  if (!showZoom) return null

  return (
    <div className="h-[22px] border-t border-border flex items-center px-2 shrink-0 z-20 bg-toolbar font-mono text-[10px] text-muted-foreground">
      <ZoomLevelIndicator />
    </div>
  )
}

function ZoomLevelIndicator() {
  const map = useMapContextOptional()?.map

  const zoom = useSyncExternalStore(
    (onStoreChange) => {
      if (!map) return () => {}
      const onChange = () => onStoreChange()
      map.on('zoom', onChange)
      map.on('moveend', onChange)
      return () => {
        map.off('zoom', onChange)
        map.off('moveend', onChange)
      }
    },
    () => (map ? Math.round(map.getZoom() * 10) / 10 : null),
    () => null,
  )

  if (zoom === null) return null

  return <span className="tabular-nums">zoom {zoom}</span>
}
