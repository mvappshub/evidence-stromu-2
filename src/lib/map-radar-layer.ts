import type maplibregl from 'maplibre-gl'
import { RAINVIEWER_MAX_ZOOM } from '@/lib/rainviewer-radar-config'
import {
  FIRST_TREE_LAYER_ID,
  RADAR_LAYER_ID,
  RADAR_SOURCE_ID,
} from '@/lib/map-layer-ids'

const RADAR_OPACITY = 0.65

export function removeRadarLayer(map: maplibregl.Map): void {
  if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID)
  if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID)
}

export function ensureRadarLayer(map: maplibregl.Map, tileUrl: string): void {
  const existing = map.getSource(RADAR_SOURCE_ID) as maplibregl.RasterTileSource | undefined
  if (existing?.tiles?.[0] && existing.tiles[0] !== tileUrl) {
    removeRadarLayer(map)
  }

  if (!map.getSource(RADAR_SOURCE_ID)) {
    map.addSource(RADAR_SOURCE_ID, {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256,
      minzoom: 0,
      maxzoom: RAINVIEWER_MAX_ZOOM,
    })
  }

  if (!map.getLayer(RADAR_LAYER_ID)) {
    const beforeId = map.getLayer(FIRST_TREE_LAYER_ID) ? FIRST_TREE_LAYER_ID : undefined
    map.addLayer(
      {
        id: RADAR_LAYER_ID,
        type: 'raster',
        source: RADAR_SOURCE_ID,
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': RADAR_OPACITY },
      },
      beforeId
    )
  }
}

export function setRadarVisibility(map: maplibregl.Map, visible: boolean): void {
  if (map.getLayer(RADAR_LAYER_ID)) {
    map.setLayoutProperty(RADAR_LAYER_ID, 'visibility', visible ? 'visible' : 'none')
  }
}
