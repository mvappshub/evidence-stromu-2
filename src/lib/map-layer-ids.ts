/** Pořadí vrstev: WMS overlays → OSM → stromy → měření */

export const TREES_LAYER_ID = 'trees-layer'
export const SELECTED_TREE_LAYER_ID = 'selected-tree-layer'

export const TREE_LAYER_IDS = [TREES_LAYER_ID, SELECTED_TREE_LAYER_ID] as const

export const HEATMAP_LAYER_ID = 'heatmap-layer'
export const OSM_TREES_LAYER_ID = 'osm-trees-layer'
export const OSM_TREES_SOURCE_ID = 'osm-trees-source'

export const MEASURE_LINE_LAYER_ID = 'measure-line-layer'
export const MEASURE_POINTS_LAYER_ID = 'measure-points-layer'
export const MEASURE_SOURCE_ID = 'measure-source'

export const TREES_SOURCE_ID = 'trees-source'
export const TREES_HEATMAP_SOURCE_ID = 'trees-source-heatmap'

/** První vrstva stromů — WMS overlaye se vkládají pod ni */
export const FIRST_TREE_LAYER_ID = TREES_LAYER_ID

/** Staré vrstvy shluků (odstraněny při obnově stylu) */
export const LEGACY_CLUSTER_LAYER_IDS = ['clusters-layer', 'cluster-count-layer'] as const

export function wmsSourceId(overlayId: string): string {
  return `overlay-${overlayId}`
}

export function wmsLayerId(overlayId: string): string {
  return `overlay-${overlayId}-layer`
}
