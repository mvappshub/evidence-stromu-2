'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { LayerMode } from './HeatmapToggle'
import { MapOverlays } from './MapOverlays'
import { useMapContext } from './MapContext'
import { useUiStore } from '@/store/useUiStore'
import { useMapGeoJson } from '@/hooks/useMapGeoJson'
import { useMapRecordMutations } from '@/hooks/useMapRecordMutations'
import { useMapTreeLayers } from '@/hooks/useMapTreeLayers'
import { useMapInit } from '@/hooks/useMapInit'
import { useMapInteractions } from '@/hooks/useMapInteractions'
import {
  useMapStyleLifecycle,
  type SavedMapCamera,
} from '@/hooks/useMapStyleLifecycle'
import type { MapStyleKey } from '@/lib/map-basemaps'
import { useMapOverlayLayers } from '@/hooks/useMapOverlayLayers'
import { useOsmTreesLayer } from '@/hooks/useOsmTreesLayer'
import { useMapIdentify } from '@/hooks/useMapIdentify'
import { usePlantStore } from '@/store/usePlantStore'

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const updateMapSourceRef = useRef<(map: maplibregl.Map) => void>(() => {})
  const applyMeasureRef = useRef<(map: maplibregl.Map) => void>(() => {})
  const mapStyleRef = useRef<MapStyleKey>('osm')
  const layerModeRef = useRef<LayerMode>('points')
  const pendingCameraRef = useRef<SavedMapCamera | null>(null)
  const [layersEpoch, setLayersEpoch] = useState(0)

  const { map } = useMapContext()
  const viewMode = useUiStore((s) => s.viewMode)
  const [layerMode, setLayerMode] = useState<LayerMode>('points')
  const selectedRecordNumber = useUiStore((s) => s.selectedRecordNumber)
  const measureMode = usePlantStore((s) => s.measureMode)
  const toggleMeasureMode = usePlantStore((s) => s.toggleMeasureMode)

  const bumpLayersEpoch = useCallback(() => {
    setLayersEpoch((n) => n + 1)
  }, [])

  const { data: geoData, isLoading: isGeoLoading } = useMapGeoJson()
  const { createMutateRef, updateMutateRef } = useMapRecordMutations()

  const { mapStyle, handleStyleChange } = useMapStyleLifecycle(
    mapRef,
    mapStyleRef,
    pendingCameraRef
  )

  useEffect(() => {
    mapStyleRef.current = mapStyle
    layerModeRef.current = layerMode
  }, [mapStyle, layerMode])

  const { handleLayerModeToggle } = useMapTreeLayers(
    map,
    layersEpoch,
    geoData,
    selectedRecordNumber,
    layerMode,
    setLayerMode,
    mapStyle,
    updateMutateRef,
    updateMapSourceRef
  )

  const {
    placeModeRef,
    measurePoints,
    totalMeasureDistance,
    clearMeasurePoints,
    cursorCoord,
    gridVisible,
    flashMarkers,
    selectedTreeInfo,
  } = useMapInteractions(
    map,
    layersEpoch,
    geoData,
    createMutateRef,
    measureMode,
    applyMeasureRef
  )

  useMapInit(
    mapContainer,
    mapRef,
    updateMapSourceRef,
    applyMeasureRef,
    placeModeRef,
    bumpLayersEpoch,
    mapStyleRef,
    layerModeRef,
    pendingCameraRef
  )
  useMapOverlayLayers()
  useOsmTreesLayer(layersEpoch)
  const { parcelInfo, setParcelInfo, identifyLoading } = useMapIdentify()

  useEffect(() => {
    const handleResize = () => mapRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!map) return
    const id = requestAnimationFrame(() => map.resize())
    return () => cancelAnimationFrame(id)
  }, [map, viewMode, layersEpoch])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      <MapOverlays
        isGeoLoading={isGeoLoading}
        featureCount={geoData?.features?.length ?? 0}
        mapStyle={mapStyle}
        onStyleChange={handleStyleChange}
        layerMode={layerMode}
        onLayerModeToggle={handleLayerModeToggle}
        measureMode={measureMode}
        onToggleMeasureMode={toggleMeasureMode}
        measurePoints={measurePoints}
        totalMeasureDistance={totalMeasureDistance}
        onClearMeasurePoints={clearMeasurePoints}
        cursorCoord={cursorCoord}
        flashMarkers={flashMarkers}
        gridVisible={gridVisible}
        selectedTreeInfo={selectedTreeInfo}
        parcelInfo={parcelInfo}
        identifyLoading={identifyLoading}
        onCloseIdentify={() => setParcelInfo(null)}
      />
    </div>
  )
}
