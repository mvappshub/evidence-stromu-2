import type maplibregl from 'maplibre-gl'
import { MAP_COLORS, MAP_COLORS_AERIAL } from '@/lib/map-colors'
import type { MapStyleKey } from '@/lib/map-basemaps'
import { isAerialBasemap } from '@/lib/map-basemaps'
import { SELECTED_TREE_LAYER_ID, TREES_LAYER_ID, TREE_LAYER_IDS } from '@/lib/map-layer-ids'

function treePointPaint(aerial: boolean): maplibregl.CircleLayerSpecification['paint'] {
  const colors = aerial ? MAP_COLORS_AERIAL : MAP_COLORS
  return {
    'circle-color': colors.point,
    'circle-radius': 6,
    'circle-stroke-width': aerial ? 2.5 : 2,
    'circle-stroke-color': aerial ? '#1e293b' : '#ffffff',
  }
}

function selectedTreePaint(aerial: boolean): maplibregl.CircleLayerSpecification['paint'] {
  const colors = aerial ? MAP_COLORS_AERIAL : MAP_COLORS
  return {
    'circle-color': colors.point,
    'circle-radius': 9,
    'circle-stroke-width': 3,
    'circle-stroke-color': colors.pointSelectedStroke,
  }
}

/** Nastaví barvy bodů podle podkladu (mapa vs. letecký snímek). */
export function applyTreeLayerPaints(map: maplibregl.Map, mapStyle: MapStyleKey): void {
  const aerial = isAerialBasemap(mapStyle)

  if (map.getLayer(TREES_LAYER_ID)) {
    const paint = treePointPaint(aerial) ?? {}
    for (const [key, value] of Object.entries(paint)) {
      map.setPaintProperty(TREES_LAYER_ID, key as keyof typeof paint, value)
    }
  }
  if (map.getLayer(SELECTED_TREE_LAYER_ID)) {
    const paint = selectedTreePaint(aerial) ?? {}
    for (const [key, value] of Object.entries(paint)) {
      map.setPaintProperty(SELECTED_TREE_LAYER_ID, key as keyof typeof paint, value)
    }
  }
}

export { TREE_LAYER_IDS }
