'use client'

import { Layers } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MAP_WMS_OVERLAYS, type MapOverlayId } from '@/lib/map-wms-definitions'
import { useMapLayerStore } from '@/store/useMapLayerStore'

const OVERLAY_IDS: MapOverlayId[] = ['parcels', 'transport', 'utilities', 'admin']

export function MapLayerPanel() {
  const overlayVisibility = useMapLayerStore((s) => s.overlayVisibility)
  const toggleOverlay = useMapLayerStore((s) => s.toggleOverlay)
  const osmTreesVisible = useMapLayerStore((s) => s.osmTreesVisible)
  const toggleOsmTrees = useMapLayerStore((s) => s.toggleOsmTrees)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="size-6 flex items-center justify-center border-l border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Vrstvy dat"
          aria-label="Vrstvy dat"
        >
          <Layers className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3 text-xs">
        <p className="font-medium text-sm mb-2">Vrstvy dat</p>
        <div className="space-y-2">
          {OVERLAY_IDS.map((id) => (
            <label key={id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={overlayVisibility[id]}
                onChange={() => toggleOverlay(id)}
                className="rounded border-border"
              />
              <span>{MAP_WMS_OVERLAYS[id].label}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={osmTreesVisible}
              onChange={toggleOsmTrees}
              className="rounded border-border"
            />
            <span>Stromy OSM</span>
          </label>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 leading-snug">
          Technické sítě: náhled DTM — ne všechny sítě, nezávazné.
        </p>
        <p className="text-[10px] text-muted-foreground mt-2 border-t border-border pt-2">
          © ČÚZK · DMVS · OpenStreetMap
        </p>
      </PopoverContent>
    </Popover>
  )
}
