import type maplibregl from 'maplibre-gl'
import type { MapStyleKey } from '@/lib/map-basemaps'
import type { LayerMode } from '@/lib/map-types'
import type { MapOverlayId } from '@/lib/map-wms-definitions'
import { ensureRadarLayer, setRadarVisibility } from '@/lib/map-radar-layer'
import { getCachedRadarTileUrl } from '@/lib/rainviewer-radar-cache'
import { ensureOsmTreesLayer, setOsmTreesVisibility } from '@/lib/map-osm-trees-layer'
import { syncWmsOverlaysNow } from '@/lib/map-wms-runtime'
import { ensureTreeStack } from '@/lib/map-tree-layers'

export interface MapRestoreContext {
  mapStyle: MapStyleKey
  layerMode: LayerMode
  overlayVisibility: Record<MapOverlayId, boolean>
  osmTreesVisible: boolean
  radarVisible: boolean
}

export interface MapRuntimeSyncCallbacks {
  updateTrees: (map: maplibregl.Map) => void
  updateMeasure?: (map: maplibregl.Map) => void
  updateLinePlace?: (map: maplibregl.Map) => void
  onLayersRestored?: () => void
}

function runTreeStackRestore(
  map: maplibregl.Map,
  ctx: MapRestoreContext,
  onComplete?: () => void
): void {
  ensureTreeStack(map, ctx.mapStyle, ctx.layerMode)
  syncWmsOverlaysNow(map, ctx.overlayVisibility)
  const radarTileUrl = getCachedRadarTileUrl()
  if (ctx.radarVisible && radarTileUrl) {
    ensureRadarLayer(map, radarTileUrl)
    setRadarVisibility(map, true)
  } else {
    setRadarVisibility(map, false)
  }
  ensureOsmTreesLayer(map)
  setOsmTreesVisibility(map, ctx.osmTreesVisible)
  onComplete?.()
}

export function restoreMapLayers(
  map: maplibregl.Map,
  ctx: MapRestoreContext,
  onComplete?: () => void
): void {
  const run = () => runTreeStackRestore(map, ctx, onComplete)

  try {
    run()
  } catch {
    // style.load can fire before the style accepts addSource/addLayer
    map.once('idle', run)
  }
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
    sync.updateLinePlace?.(map)
    sync.onLayersRestored?.()
  })
}
