'use client'

import { useEffect, useState } from 'react'
import type maplibregl from 'maplibre-gl'
import { fetchParcelFeatureInfo, type ParcelIdentifyResult } from '@/lib/wms-feature-info'
import { MAP_WMS_OVERLAYS } from '@/lib/map-wms-definitions'
import { TREE_LAYER_IDS } from '@/lib/map-layer-ids'
import { useMapLayerStore } from '@/store/useMapLayerStore'
import { usePlantStore } from '@/store/usePlantStore'
import { useMapContext } from '@/components/map/MapContext'

export function useMapIdentify() {
  const { map } = useMapContext()
  const parcelsVisible = useMapLayerStore((s) => s.overlayVisibility.parcels)
  const placeMode = usePlantStore((s) => s.placeMode)
  const measureMode = usePlantStore((s) => s.measureMode)
  const [parcelInfo, setParcelInfo] = useState<ParcelIdentifyResult | null>(null)
  const [identifyLoading, setIdentifyLoading] = useState(false)

  useEffect(() => {
    if (!map) return

    const handleClick = async (e: maplibregl.MapMouseEvent) => {
      if (placeMode || measureMode || !parcelsVisible) return

      const treeLayerIds = TREE_LAYER_IDS.filter((id) => map.getLayer(id))
      if (treeLayerIds.length > 0) {
        const treeHits = map.queryRenderedFeatures(e.point, { layers: treeLayerIds })
        if (treeHits.length > 0) return
      }

      setIdentifyLoading(true)
      try {
        const result = await fetchParcelFeatureInfo(map, MAP_WMS_OVERLAYS.parcels, e.point)
        setParcelInfo(result)
      } finally {
        setIdentifyLoading(false)
      }
    }

    map.on('click', handleClick)
    return () => {
      map.off('click', handleClick)
    }
  }, [map, parcelsVisible, placeMode, measureMode])

  return { parcelInfo, setParcelInfo, identifyLoading }
}
