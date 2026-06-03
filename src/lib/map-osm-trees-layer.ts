import type maplibregl from 'maplibre-gl'
import {
  FIRST_TREE_LAYER_ID,
  OSM_TREES_LAYER_ID,
  OSM_TREES_SOURCE_ID,
} from '@/lib/map-layer-ids'

export function ensureOsmTreesLayer(map: maplibregl.Map): void {
  if (!map.getSource(OSM_TREES_SOURCE_ID)) {
    map.addSource(OSM_TREES_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }

  if (!map.getLayer(OSM_TREES_LAYER_ID)) {
    const beforeId = map.getLayer(FIRST_TREE_LAYER_ID) ? FIRST_TREE_LAYER_ID : undefined
    map.addLayer(
      {
        id: OSM_TREES_LAYER_ID,
        type: 'circle',
        source: OSM_TREES_SOURCE_ID,
        layout: { visibility: 'none' },
        paint: {
          'circle-color': '#6b7280',
          'circle-radius': 4,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#d1d5db',
          'circle-opacity': 0.7,
        },
      },
      beforeId
    )
  }
}

export function setOsmTreesVisibility(map: maplibregl.Map, visible: boolean): void {
  if (map.getLayer(OSM_TREES_LAYER_ID)) {
    map.setLayoutProperty(OSM_TREES_LAYER_ID, 'visibility', visible ? 'visible' : 'none')
  }
}

export function setOsmTreesData(
  map: maplibregl.Map,
  data: GeoJSON.FeatureCollection
): void {
  const source = map.getSource(OSM_TREES_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
  source?.setData(data)
}
