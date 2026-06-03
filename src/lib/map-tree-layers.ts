import type maplibregl from 'maplibre-gl'
import { isAerialBasemap, type MapStyleKey } from '@/lib/map-basemaps'
import { applyTreeLayerPaints } from '@/lib/map-tree-layer-paints'
import { ensureHeatmapLayer } from '@/lib/map-heatmap'
import {
  FIRST_TREE_LAYER_ID,
  LEGACY_CLUSTER_LAYER_IDS,
  MEASURE_LINE_LAYER_ID,
  MEASURE_POINTS_LAYER_ID,
  HEATMAP_LAYER_ID,
  MEASURE_SOURCE_ID,
  SELECTED_TREE_LAYER_ID,
  TREE_LAYER_IDS,
  TREES_LAYER_ID,
  TREES_SOURCE_ID,
} from '@/lib/map-layer-ids'

function removeLegacyTreeLayers(map: maplibregl.Map): void {
  for (const id of [...LEGACY_CLUSTER_LAYER_IDS, ...TREE_LAYER_IDS]) {
    if (map.getLayer(id)) map.removeLayer(id)
  }
}

export function ensureTreeSource(map: maplibregl.Map): void {
  if (!map.getSource(TREES_SOURCE_ID)) {
    map.addSource(TREES_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
}

export function ensureTreeLayers(map: maplibregl.Map, mapStyle: MapStyleKey): void {
  ensureTreeSource(map)

  if (map.getLayer(LEGACY_CLUSTER_LAYER_IDS[0]) || !map.getLayer(TREES_LAYER_ID)) {
    removeLegacyTreeLayers(map)
    map.addLayer({
      id: TREES_LAYER_ID,
      type: 'circle',
      source: TREES_SOURCE_ID,
      filter: ['!=', ['get', 'selected'], true],
      paint: {},
    })
    map.addLayer({
      id: SELECTED_TREE_LAYER_ID,
      type: 'circle',
      source: TREES_SOURCE_ID,
      filter: ['==', ['get', 'selected'], true],
      paint: {},
    })
  }

  applyTreeLayerPaints(map, mapStyle)
}

export function ensureMeasureLayers(map: maplibregl.Map): void {
  if (!map.getSource(MEASURE_SOURCE_ID)) {
    map.addSource(MEASURE_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
    map.addLayer({
      id: MEASURE_LINE_LAYER_ID,
      type: 'line',
      source: MEASURE_SOURCE_ID,
      paint: {
        'line-color': '#ef4444',
        'line-width': 2,
        'line-dasharray': [4, 3],
      },
    })
    map.addLayer({
      id: MEASURE_POINTS_LAYER_ID,
      type: 'circle',
      source: MEASURE_SOURCE_ID,
      filter: ['==', ['get', 'measurePoint'], true],
      paint: {
        'circle-color': '#ef4444',
        'circle-radius': 5,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })
  }
}

export function ensureTreeStack(
  map: maplibregl.Map,
  mapStyle: MapStyleKey,
  layerMode: 'points' | 'heatmap'
): void {
  ensureTreeLayers(map, mapStyle)
  ensureHeatmapLayer(map, layerMode === 'heatmap', isAerialBasemap(mapStyle))
  ensureMeasureLayers(map)
  applyLayerModeVisibility(map, layerMode)
}

export function applyLayerModeVisibility(
  map: maplibregl.Map,
  layerMode: 'points' | 'heatmap'
): void {
  if (!map.isStyleLoaded()) return

  const showHeatmap = layerMode === 'heatmap'
  TREE_LAYER_IDS.forEach((id) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', showHeatmap ? 'none' : 'visible')
    }
  })
  if (map.getLayer(HEATMAP_LAYER_ID)) {
    map.setLayoutProperty(HEATMAP_LAYER_ID, 'visibility', showHeatmap ? 'visible' : 'none')
  }
}

export { FIRST_TREE_LAYER_ID }
