'use client'

import { useCallback, useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { LayerMode } from '@/components/map/HeatmapToggle'
import type { MapStyleKey } from '@/lib/map-basemaps'
import { MAP_COLORS } from '@/lib/map-colors'
import { TREES_HEATMAP_SOURCE_ID, TREES_SOURCE_ID } from '@/lib/map-layer-ids'
import { applyLayerModeVisibility } from '@/lib/map-tree-layers'
import type { GeoJsonResponse } from '@/hooks/useMapGeoJson'
import { readTreeMapFeatureProperties } from '@/lib/tree-map-geojson'
import { usePlantStore } from '@/store/usePlantStore'

export function useMapTreeLayers(
  map: maplibregl.Map | null,
  layersEpoch: number,
  geoData: GeoJsonResponse | undefined,
  selectedRecordNumber: number | null,
  layerMode: LayerMode,
  setLayerMode: (mode: LayerMode) => void,
  mapStyle: MapStyleKey,
  updateMutateRef: React.RefObject<
    ((args: { recordNumber: number; lat: number; lng: number }) => void) | undefined
  >,
  updateMapSourceRef: React.MutableRefObject<(map: maplibregl.Map) => void>
) {
  const hasFittedBounds = useRef(false)
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null)
  const lastFlownToRecordRef = useRef<number | null>(null)
  const placeMode = usePlantStore((s) => s.placeMode)

  const fitMapToGeoData = useCallback(
    (m: maplibregl.Map) => {
      if (hasFittedBounds.current || !geoData?.features?.length) return
      if (!m.getSource(TREES_SOURCE_ID)) return
      hasFittedBounds.current = true
      const bounds = new maplibregl.LngLatBounds()
      geoData.features.forEach((f) => {
        bounds.extend(f.geometry.coordinates as [number, number])
      })
      m.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 1000 })
    },
    [geoData]
  )

  const updateMapSource = useCallback(
    (m: maplibregl.Map) => {
      if (!m.getSource(TREES_SOURCE_ID)) return
      const features = (geoData?.features ?? []).map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          selected:
            readTreeMapFeatureProperties(f.properties)?.recordNumber ===
            selectedRecordNumber,
        },
      }))
      ;(m.getSource(TREES_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features,
      })
      fitMapToGeoData(m)
    },
    [geoData, selectedRecordNumber, fitMapToGeoData]
  )

  useEffect(() => {
    updateMapSourceRef.current = updateMapSource
  }, [updateMapSource, updateMapSourceRef])

  useEffect(() => {
    if (!map) return

    const pushHeatmapData = () => {
      if (!map.getSource(TREES_HEATMAP_SOURCE_ID)) return false
      const heatmapData = geoData ?? { type: 'FeatureCollection', features: [] }
      ;(map.getSource(TREES_HEATMAP_SOURCE_ID) as maplibregl.GeoJSONSource).setData(
        heatmapData as GeoJSON.FeatureCollection
      )
      return true
    }

    if (pushHeatmapData()) return

    const onReady = () => {
      pushHeatmapData()
    }
    map.on('idle', onReady)
    map.on('style.load', onReady)
    return () => {
      map.off('idle', onReady)
      map.off('style.load', onReady)
    }
  }, [map, layersEpoch, geoData])

  useEffect(() => {
    if (!map) return

    const pushTreeData = () => {
      if (!map.getSource(TREES_SOURCE_ID)) return false
      updateMapSource(map)
      return true
    }

    if (pushTreeData()) return

    const onReady = () => {
      pushTreeData()
    }
    map.on('idle', onReady)
    map.on('style.load', onReady)
    return () => {
      map.off('idle', onReady)
      map.off('style.load', onReady)
    }
  }, [map, layersEpoch, geoData, selectedRecordNumber, updateMapSource])

  useEffect(() => {
    hasFittedBounds.current = false
  }, [layersEpoch])

  useEffect(() => {
    if (!map) return
    fitMapToGeoData(map)
  }, [map, layersEpoch, geoData, fitMapToGeoData])

  // Pan only when the user picks a different record (e.g. table row), not on every geo refresh.
  useEffect(() => {
    if (!map) return

    if (selectedRecordNumber == null) {
      lastFlownToRecordRef.current = null
      return
    }

    if (placeMode) return

    if (lastFlownToRecordRef.current === selectedRecordNumber) return

    const feature = geoData?.features?.find(
      (f) =>
        readTreeMapFeatureProperties(f.properties)?.recordNumber ===
        selectedRecordNumber
    )
    if (!feature) return

    lastFlownToRecordRef.current = selectedRecordNumber
    const [lng, lat] = feature.geometry.coordinates
    map.flyTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 800,
    })
  }, [selectedRecordNumber, geoData, map, placeMode])

  useEffect(() => {
    if (!map) return

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove()
      selectedMarkerRef.current = null
    }
    if (selectedRecordNumber == null) return

    const feature = geoData?.features?.find(
      (f) =>
        readTreeMapFeatureProperties(f.properties)?.recordNumber ===
        selectedRecordNumber
    )
    if (!feature) return

    const [lng, lat] = feature.geometry.coordinates
    const el = document.createElement('div')
    el.className = 'selected-tree-marker'
    el.style.width = '18px'
    el.style.height = '18px'
    el.style.borderRadius = '50%'
    el.style.backgroundColor = MAP_COLORS.point
    el.style.border = '3px solid #eab308'
    el.style.cursor = 'grab'
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'

    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat([lng, lat])
      .addTo(map)

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat()
      updateMutateRef.current?.({
        recordNumber: selectedRecordNumber,
        lat: lngLat.lat,
        lng: lngLat.lng,
      })
    })

    selectedMarkerRef.current = marker
    return () => {
      selectedMarkerRef.current?.remove()
      selectedMarkerRef.current = null
    }
  }, [selectedRecordNumber, geoData, map, layersEpoch, updateMutateRef])

  const handleLayerModeToggle = useCallback(() => {
    if (!map) return
    const newMode: LayerMode = layerMode === 'points' ? 'heatmap' : 'points'
    setLayerMode(newMode)
    applyLayerModeVisibility(map, newMode)
  }, [layerMode, map, setLayerMode])

  useEffect(() => {
    if (!map) return
    applyLayerModeVisibility(map, layerMode)
  }, [map, layersEpoch, layerMode, mapStyle])

  return {
    handleLayerModeToggle,
  }
}
