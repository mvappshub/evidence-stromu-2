import type maplibregl from 'maplibre-gl'
import type { MapStyleKey } from '@/lib/map-basemaps'
import type { LayerMode } from '@/components/map/HeatmapToggle'
import type { MapOverlayId } from '@/lib/map-wms-definitions'
import { ensureOsmTreesLayer, setOsmTreesVisibility } from '@/lib/map-osm-trees-layer'
import { syncWmsOverlaysNow } from '@/lib/map-wms-runtime'
import { ensureTreeStack } from '@/lib/map-tree-layers'
import { runWhenStyleReady } from '@/lib/map-style-ready'

export interface MapRestoreContext {
  mapStyle: MapStyleKey
  layerMode: LayerMode
  overlayVisibility: Record<MapOverlayId, boolean>
  osmTreesVisible: boolean
}

export interface MapRuntimeSyncCallbacks {
  updateTrees: (map: maplibregl.Map) => void
  updateMeasure?: (map: maplibregl.Map) => void
  onLayersRestored?: () => void
}

export function restoreMapLayers(
  map: maplibregl.Map,
  ctx: MapRestoreContext,
  onComplete?: () => void
): void {
  runWhenStyleReady(map, () => {
    ensureTreeStack(map, ctx.mapStyle, ctx.layerMode)
    syncWmsOverlaysNow(map, ctx.overlayVisibility)
    ensureOsmTreesLayer(map)
    setOsmTreesVisibility(map, ctx.osmTreesVisible)
    onComplete?.()
  })
}

/** Obnoví custom vrstvy po load/setStyle a znovu naplní zdroje stromů a měření. */
export function restoreAndSyncMapRuntime(
  map: maplibregl.Map,
  ctx: MapRestoreContext,
  sync: MapRuntimeSyncCallbacks
): void {
  restoreMapLayers(map, ctx, () => {
    sync.updateTrees(map)
    sync.updateMeasure?.(map)
    sync.onLayersRestored?.()
  })
}
