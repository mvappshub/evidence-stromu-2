import type maplibregl from 'maplibre-gl'
import { MAP_COLORS, MAP_COLORS_AERIAL } from '@/lib/map-colors'
import { HEATMAP_LAYER_ID, TREES_HEATMAP_SOURCE_ID } from '@/lib/map-layer-ids'

export function heatmapColorExpression(
  aerial: boolean
): maplibregl.ExpressionSpecification {
  const palette = aerial ? MAP_COLORS_AERIAL.heatmap : MAP_COLORS.heatmap
  return [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    palette[0],
    0.2,
    palette[1],
    0.4,
    palette[2],
    0.6,
    palette[3],
    0.8,
    palette[4],
    1,
    palette[5],
  ]
}

export function ensureHeatmapLayer(
  map: maplibregl.Map,
  visible: boolean,
  aerial: boolean
): void {
  if (!map.getSource(TREES_HEATMAP_SOURCE_ID)) {
    map.addSource(TREES_HEATMAP_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }

  if (!map.getLayer(HEATMAP_LAYER_ID)) {
    map.addLayer({
      id: HEATMAP_LAYER_ID,
      type: 'heatmap',
      source: TREES_HEATMAP_SOURCE_ID,
      layout: { visibility: visible ? 'visible' : 'none' },
      paint: {
        'heatmap-weight': 1,
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 14, 3],
        'heatmap-color': heatmapColorExpression(aerial),
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 10, 15, 14, 25],
        'heatmap-opacity': 0.7,
      },
    })
  } else if (map.getLayer(HEATMAP_LAYER_ID)) {
    map.setPaintProperty(HEATMAP_LAYER_ID, 'heatmap-color', heatmapColorExpression(aerial))
    map.setLayoutProperty(HEATMAP_LAYER_ID, 'visibility', visible ? 'visible' : 'none')
  }
}
