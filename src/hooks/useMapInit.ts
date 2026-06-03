'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { format } from 'date-fns'
import { getMapStyle, type MapStyleKey } from '@/lib/map-basemaps'
import { MAP_CENTER, MAP_ZOOM } from '@/lib/map-constants'
import { restoreAndSyncMapRuntime } from '@/lib/map-layer-restore'
import { getRestoreContextFromStore } from '@/store/useMapLayerStore'
import { useMapContext } from '@/components/map/MapContext'
import type { LayerMode } from '@/components/map/HeatmapToggle'
import type { SavedMapCamera } from '@/hooks/useMapStyleLifecycle'

export function useMapInit(
  mapContainer: React.RefObject<HTMLDivElement | null>,
  mapRef: React.RefObject<maplibregl.Map | null>,
  updateMapSourceRef: React.RefObject<(map: maplibregl.Map) => void>,
  applyMeasureRef: React.RefObject<(map: maplibregl.Map) => void>,
  placeModeRef: React.RefObject<boolean>,
  onLayersRestored: () => void,
  mapStyleRef: React.MutableRefObject<MapStyleKey>,
  layerModeRef: React.MutableRefObject<LayerMode>,
  pendingCameraRef: React.MutableRefObject<SavedMapCamera | null>
) {
  const { setMap, setBearing } = useMapContext()
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const popupRecordNumberRef = useRef<number | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return
    if (mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyle(mapStyleRef.current),
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    const onTreeLayerMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
      if (!e.features?.length) return
      const feat = e.features[0]
      const props = feat.properties!
      map.getCanvas().style.cursor = placeModeRef.current ? 'crosshair' : 'pointer'

      const recordNumber = Number(props.recordNumber)
      if (popupRecordNumberRef.current === recordNumber) return
      popupRecordNumberRef.current = recordNumber

      const coordinates = (feat.geometry as GeoJSON.Point).coordinates.slice() as [
        number,
        number,
      ]
      const date = props.plantedAt ? format(new Date(props.plantedAt), 'd.M.yyyy') : ''
      const locality = props.locality ? `<br/>📍 ${props.locality}` : ''

      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
        className: 'tree-popup',
      })
        .setLngLat(coordinates)
        .setHTML(
          `<div style="font-size:12px"><em>${props.speciesLatin}</em><br/>📅 ${date}${locality}</div>`
        )
        .addTo(map)
    }

    const onTreeLayerMouseLeave = () => {
      map.getCanvas().style.cursor = placeModeRef.current ? 'crosshair' : ''
      popupRecordNumberRef.current = null
      popupRef.current?.remove()
      popupRef.current = null
    }

    const attachTreeHover = () => {
      if (!map.getLayer('trees-layer')) return
      map.on('mousemove', 'trees-layer', onTreeLayerMouseMove)
      map.on('mouseleave', 'trees-layer', onTreeLayerMouseLeave)
    }

    const detachTreeHover = () => {
      map.off('mousemove', 'trees-layer', onTreeLayerMouseMove)
      map.off('mouseleave', 'trees-layer', onTreeLayerMouseLeave)
    }

    const syncCustomLayers = () => {
      const camera = pendingCameraRef.current
      if (camera) {
        map.jumpTo(camera)
        pendingCameraRef.current = null
      }

      restoreAndSyncMapRuntime(
        map,
        getRestoreContextFromStore(mapStyleRef.current, layerModeRef.current),
        {
          updateTrees: (m) => updateMapSourceRef.current(m),
          updateMeasure: (m) => applyMeasureRef.current(m),
          onLayersRestored,
        }
      )

      detachTreeHover()
      attachTreeHover()
    }

    map.on('style.load', syncCustomLayers)

    mapRef.current = map
    setMap(map)

    const onViewChange = () => updateMapSourceRef.current(map)
    map.on('moveend', onViewChange)
    map.on('zoomend', onViewChange)

    const onRotate = () => setBearing(map.getBearing())
    map.on('rotate', onRotate)

    return () => {
      map.off('style.load', syncCustomLayers)
      map.off('rotate', onRotate)
      map.off('moveend', onViewChange)
      map.off('zoomend', onViewChange)
      detachTreeHover()
      popupRef.current?.remove()
      map.remove()
      mapRef.current = null
      setMap(null)
    }
  }, [
    mapContainer,
    mapRef,
    setMap,
    setBearing,
    updateMapSourceRef,
    applyMeasureRef,
    placeModeRef,
    onLayersRestored,
    mapStyleRef,
    layerModeRef,
    pendingCameraRef,
  ])
}
