import type maplibregl from 'maplibre-gl'
import {
  buildWmsTileUrl,
  MAP_OVERLAY_ORDER,
  MAP_WMS_OVERLAYS,
  type MapOverlayId,
  type MapWmsDefinition,
} from '@/lib/map-wms-definitions'
import { FIRST_TREE_LAYER_ID, wmsLayerId, wmsSourceId } from '@/lib/map-layer-ids'
import { runWhenStyleReady } from '@/lib/map-style-ready'

export function removeWmsOverlay(map: maplibregl.Map, overlayId: MapOverlayId): void {
  const layerId = wmsLayerId(overlayId)
  const sourceId = wmsSourceId(overlayId)
  if (map.getLayer(layerId)) map.removeLayer(layerId)
  if (map.getSource(sourceId)) map.removeSource(sourceId)
}

export function ensureWmsOverlay(map: maplibregl.Map, overlayId: MapOverlayId): void {
  const def = MAP_WMS_OVERLAYS[overlayId]
  const sourceId = wmsSourceId(overlayId)
  const layerId = wmsLayerId(overlayId)
  const tileUrl = buildWmsTileUrl(def)

  const existing = map.getSource(sourceId) as maplibregl.RasterTileSource | undefined
  if (existing?.tiles?.[0] && existing.tiles[0] !== tileUrl) {
    removeWmsOverlay(map, overlayId)
  }

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256,
      minzoom: def.minzoom ?? 0,
    })
  }

  if (!map.getLayer(layerId)) {
    const beforeId = map.getLayer(FIRST_TREE_LAYER_ID) ? FIRST_TREE_LAYER_ID : undefined
    map.addLayer(
      {
        id: layerId,
        type: 'raster',
        source: sourceId,
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': overlayId === 'parcels' ? 0.85 : 0.75 },
      },
      beforeId
    )
  }
}

export function setWmsOverlayVisibility(
  map: maplibregl.Map,
  overlayId: MapOverlayId,
  visible: boolean
): void {
  const layerId = wmsLayerId(overlayId)
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
  }
}

/** Volat jen když je styl načtený (nebo uvnitř runWhenStyleReady). */
export function syncWmsOverlaysNow(
  map: maplibregl.Map,
  visibility: Record<MapOverlayId, boolean>
): void {
  for (const id of MAP_OVERLAY_ORDER) {
    const visible = visibility[id] ?? false
    if (visible) {
      ensureWmsOverlay(map, id)
    }
    setWmsOverlayVisibility(map, id, visible)
  }
}

export function syncWmsOverlays(
  map: maplibregl.Map,
  visibility: Record<MapOverlayId, boolean>
): void {
  runWhenStyleReady(map, () => syncWmsOverlaysNow(map, visibility))
}

export function getWmsDefinition(overlayId: MapOverlayId): MapWmsDefinition {
  return MAP_WMS_OVERLAYS[overlayId]
}
