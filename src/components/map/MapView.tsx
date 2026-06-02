'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Supercluster from 'supercluster'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useUiStore } from '@/store/useUiStore'
import { usePlantStore } from '@/store/usePlantStore'
import { getMapStyle } from './MapStyleSwitcher'
import type { MapStyleKey } from './MapStyleSwitcher'
import type { LayerMode } from './HeatmapToggle'
import { MapOverlays } from './MapOverlays'
import { toast } from 'sonner'
import { haversineDistance } from '@/lib/haversine'
import { useMapContext } from '@/components/map/MapContext'
import { useMapGeoJson } from '@/hooks/useMapGeoJson'
import { MAP_COLORS } from '@/lib/map-colors'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TreeProperties {
  recordNumber: number
  speciesLatin: string
  plantedAt: string
  locality: string | null
  cluster?: boolean
  point_count?: number
  selected?: boolean
}

interface TreeFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: TreeProperties
}

interface GeoJsonResponse {
  type: 'FeatureCollection'
  features: TreeFeature[]
}

interface ClusterPoint {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: {
    cluster: boolean
    point_count: number
    recordNumber?: number
    speciesLatin?: string
    plantedAt?: string
    locality?: string | null
    selected?: boolean
  }
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAP_CENTER: [number, number] = [15.47, 49.82]
const MAP_ZOOM = 7
const CLUSTER_RADIUS = 60
const CLUSTER_MAX_ZOOM = 17

const MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
} as maplibregl.StyleSpecification

/* ------------------------------------------------------------------ */
/*  Helper: add heatmap source + layer to a map                       */
/* ------------------------------------------------------------------ */

function addHeatmapToMap(map: maplibregl.Map, visible: boolean = false) {
  if (!map.getSource('trees-source-heatmap')) {
    map.addSource('trees-source-heatmap', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }

  if (!map.getLayer('heatmap-layer')) {
    map.addLayer({
      id: 'heatmap-layer',
      type: 'heatmap',
      source: 'trees-source-heatmap',
      layout: {
        visibility: visible ? 'visible' : 'none',
      },
      paint: {
        'heatmap-weight': 1,
        'heatmap-intensity': [
          'interpolate', ['linear'], ['zoom'],
          0, 1,
          14, 3,
        ],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, MAP_COLORS.heatmap[0],
          0.2, MAP_COLORS.heatmap[1],
          0.4, MAP_COLORS.heatmap[2],
          0.6, MAP_COLORS.heatmap[3],
          0.8, MAP_COLORS.heatmap[4],
          1, MAP_COLORS.heatmap[5],
        ],
        'heatmap-radius': [
          'interpolate', ['linear'], ['zoom'],
          0, 5,
          10, 15,
          14, 25,
        ],
        'heatmap-opacity': 0.7,
      },
    })
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const superclusterRef = useRef<Supercluster | null>(null)
  const isMapReady = useRef(false)
  const updateMapSourceRef = useRef<(map: maplibregl.Map) => void>(() => {})
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const popupRecordNumberRef = useRef<number | null>(null)
  const hasFittedBounds = useRef(false)
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null)
  const createMutateRef = useRef<((args: { lat: number; lng: number }) => void) | null>(null)
  const updateMutateRef = useRef<((args: { recordNumber: number; lat: number; lng: number }) => void) | null>(null)
  const cursorCoordFrameRef = useRef<number | null>(null)
  const pendingCursorCoordRef = useRef<{ lat: number; lng: number } | null>(null)
  const lastCursorCoordKeyRef = useRef<string | null>(null)

  const selectedRecordNumber = useUiStore((s) => s.selectedRecordNumber)
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const { setMap, setBearing } = useMapContext()
  const placeMode = usePlantStore((s) => s.placeMode)
  const measureMode = usePlantStore((s) => s.measureMode)
  const toggleMeasureMode = usePlantStore((s) => s.toggleMeasureMode)
  const activeSpecies = usePlantStore((s) => s.activeSpecies)
  const activeDate = usePlantStore((s) => s.activeDate)
  const activeLocality = usePlantStore((s) => s.activeLocality)
  const setLastInsertedRecordNumber = usePlantStore((s) => s.setLastInsertedRecordNumber)
  const lastInsertedRecordNumber = usePlantStore((s) => s.lastInsertedRecordNumber)
  const addToRecentSpecies = usePlantStore((s) => s.addToRecentSpecies)
  const queryClient = useQueryClient()

  const placeModeRef = useRef(placeMode)
  const measureModeRef = useRef(measureMode)

  // Keep placeMode ref updated
  useEffect(() => { placeModeRef.current = placeMode }, [placeMode])
  // Keep measureMode ref updated
  useEffect(() => { measureModeRef.current = measureMode }, [measureMode])

  /* ---- Measurement tool state ----------------------------------- */
  const [measurePoints, setMeasurePoints] = useState<Array<{ lat: number; lng: number }>>([])

  // Compute total measurement distance
  const totalMeasureDistance = useMemo(() => {
    let total = 0
    for (let i = 1; i < measurePoints.length; i++) {
      total += haversineDistance(
        measurePoints[i - 1].lat, measurePoints[i - 1].lng,
        measurePoints[i].lat, measurePoints[i].lng
      )
    }
    return total
  }, [measurePoints])

  const clearMeasurePoints = useCallback(() => {
    setMeasurePoints([])
  }, [])

  /* ---- Layer mode state ----------------------------------------- */
  const [layerMode, setLayerMode] = useState<LayerMode>('points')

  /* ---- Mouse coordinate state ----------------------------------- */
  const [cursorCoord, setCursorCoord] = useState<{ lat: number; lng: number } | null>(null)
  const [gridVisible, setGridVisible] = useState(false)

  /* ---- Data fetching --------------------------------------------- */
  const { data: geoData } = useMapGeoJson()

  /* ---- Create record mutation ------------------------------------ */
  const createMutation = useMutation({
    mutationFn: async (data: { lat: number; lng: number }) => {
      const speciesLatin = activeSpecies.trim()
      const plantedAt = activeDate.trim()
      if (!speciesLatin || !plantedAt) {
        throw new Error('Vyplňte druh a datum výsadby v liště pod mapou')
      }

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          speciesLatin,
          plantedAt,
          locality: activeLocality.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const detail = Array.isArray(err.details)
          ? err.details.map((d: { message?: string }) => d.message).filter(Boolean).join(', ')
          : ''
        throw new Error(err.error && detail ? `${err.error}: ${detail}` : err.error || 'Nepodařilo se vytvořit záznam')
      }
      return res.json()
    },
    onSuccess: (data) => {
      const rn: number = data.record?.recordNumber ?? data.recordNumber
      if (rn) {
        setLastInsertedRecordNumber(rn)
        toast.success('Strom vložen', { description: `Záznam #${rn} vytvořen` })
      }
      if (activeSpecies) {
        addToRecentSpecies(activeSpecies)
      }
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      queryClient.invalidateQueries({ queryKey: ['records'] })
    },
    onError: (error) => {
      toast.error('Chyba', {
        description: error instanceof Error ? error.message : 'Nepodařilo se vložit strom',
      })
    },
  })

  // Keep create mutate ref updated without rebinding map click listeners on render.
  useEffect(() => { createMutateRef.current = createMutation.mutate }, [createMutation.mutate])

  /* ---- Update record mutation (drag) ----------------------------- */
  const updateMutation = useMutation({
    mutationFn: async ({ recordNumber, lat, lng }: { recordNumber: number; lat: number; lng: number }) => {
      const res = await fetch(`/api/records/${recordNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      toast.success('Pozice aktualizována')
    },
  })

  // Keep updateMutate ref updated for drag handler
  useEffect(() => { updateMutateRef.current = updateMutation.mutate }, [updateMutation])

  /* ---- Build supercluster index from geoData --------------------- */
  const superclusterIndex = useMemo(() => {
    if (!geoData?.features?.length) return null
    const index = new Supercluster({
      radius: CLUSTER_RADIUS,
      maxZoom: CLUSTER_MAX_ZOOM,
    })
    index.load(geoData.features as unknown as Supercluster.PointFeature<{ recordNumber: number; speciesLatin: string; plantedAt: string; locality: string | null }>[])

    return index
  }, [geoData])

  useEffect(() => {
    superclusterRef.current = superclusterIndex
  }, [superclusterIndex])

  /* ---- Compute clusters for current view ------------------------- */
  const getClusters = useCallback(
    (map: maplibregl.Map): ClusterPoint[] => {
      const sc = superclusterRef.current
      if (!sc) return []

      const bounds = map.getBounds()
      const zoom = Math.round(map.getZoom())
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]

      return sc.getClusters(bbox, zoom) as unknown as ClusterPoint[]
    },
    []
  )

  /* ---- Update map source with cluster/point data ----------------- */
  const updateMapSource = useCallback(
    (map: maplibregl.Map) => {
      if (!map.getSource('trees-source')) return

      const clusters = getClusters(map)

      // Mark selected point
      const features: ClusterPoint[] = clusters.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          selected:
            !f.properties.cluster &&
            f.properties.recordNumber === selectedRecordNumber,
        },
      }))

      ;(map.getSource('trees-source') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features,
      })
    },
    [getClusters, selectedRecordNumber]
  )

  // Keep the ref updated with the latest closure
  useEffect(() => {
    updateMapSourceRef.current = updateMapSource
  }, [updateMapSource])

  /* ---- Update heatmap source when geoData changes ---------------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady.current) return
    if (!map.getSource('trees-source-heatmap')) return

    // Feed the raw (unclustered) GeoJSON data to the heatmap source
    const heatmapData = geoData ?? { type: 'FeatureCollection', features: [] }
    ;(map.getSource('trees-source-heatmap') as maplibregl.GeoJSONSource).setData(
      heatmapData as GeoJSON.FeatureCollection
    )
  }, [geoData])

  /* ---- Initialize map -------------------------------------------- */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    map.on('load', () => {
      isMapReady.current = true

      // Add GeoJSON source
      map.addSource('trees-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // Cluster circle layer
      map.addLayer({
        id: 'clusters-layer',
        type: 'circle',
        source: 'trees-source',
        filter: ['==', ['get', 'cluster'], true],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            MAP_COLORS.cluster[0],
            10,
            MAP_COLORS.cluster[1],
            50,
            MAP_COLORS.cluster[2],
            200,
            MAP_COLORS.cluster[3],
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            18,
            10,
            24,
            50,
            30,
            200,
            36,
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      })

      // Cluster count label
      map.addLayer({
        id: 'cluster-count-layer',
        type: 'symbol',
        source: 'trees-source',
        filter: ['==', ['get', 'cluster'], true],
        layout: {
          'text-field': ['get', 'point_count'],
          'text-font': ['Open Sans Bold'],
          'text-size': 13,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })

      // Individual tree points
      map.addLayer({
        id: 'trees-layer',
        type: 'circle',
        source: 'trees-source',
        filter: ['!=', ['get', 'cluster'], true],
        paint: {
          'circle-color': MAP_COLORS.point,
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      // Selected tree highlight
      map.addLayer({
        id: 'selected-tree-layer',
        type: 'circle',
        source: 'trees-source',
        filter: ['==', ['get', 'selected'], true],
        paint: {
          'circle-color': MAP_COLORS.point,
          'circle-radius': 9,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#eab308',
        },
      })

      // Add heatmap source and layer (hidden by default)
      addHeatmapToMap(map, false)

      // Add measurement line source + layer
      map.addSource('measure-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'measure-line-layer',
        type: 'line',
        source: 'measure-source',
        paint: {
          'line-color': '#ef4444',
          'line-width': 2,
          'line-dasharray': [4, 3],
        },
      })
      map.addLayer({
        id: 'measure-points-layer',
        type: 'circle',
        source: 'measure-source',
        filter: ['==', ['get', 'measurePoint'], true],
        paint: {
          'circle-color': '#ef4444',
          'circle-radius': 5,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      // Hover popup on individual tree points
      map.on('mousemove', 'trees-layer', (e) => {
        if (e.features && e.features.length > 0) {
          const feat = e.features[0]
          const props = feat.properties!
          map.getCanvas().style.cursor = placeModeRef.current ? 'crosshair' : 'pointer'

          const recordNumber = Number(props.recordNumber)
          if (popupRecordNumberRef.current === recordNumber) return
          popupRecordNumberRef.current = recordNumber

          const coordinates = (feat.geometry as any).coordinates.slice()
          const date = props.plantedAt ? format(new Date(props.plantedAt), 'd.M.yyyy') : ''
          const locality = props.locality ? `<br/>📍 ${props.locality}` : ''

          if (popupRef.current) popupRef.current.remove()
          popupRef.current = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 10,
            className: 'tree-popup',
          })
            .setLngLat(coordinates)
            .setHTML(`<div style="font-size:12px"><em>${props.speciesLatin}</em><br/>📅 ${date}${locality}</div>`)
            .addTo(map)
        }
      })

      map.on('mouseleave', 'trees-layer', () => {
        map.getCanvas().style.cursor = placeModeRef.current ? 'crosshair' : ''
        popupRecordNumberRef.current = null
        if (popupRef.current) {
          popupRef.current.remove()
          popupRef.current = null
        }
      })

      // Update on move/zoom using ref to avoid stale closures
      map.on('moveend', () => updateMapSourceRef.current(map))
      map.on('zoomend', () => updateMapSourceRef.current(map))

      // Initial render
      updateMapSourceRef.current(map)
    })

    mapRef.current = map
    setMap(map)

    const onRotate = () => setBearing(map.getBearing())
    map.on('rotate', onRotate)

    return () => {
      map.off('rotate', onRotate)
      map.remove()
      mapRef.current = null
      setMap(null)
      isMapReady.current = false
    }
  }, [setMap, setBearing])

  /* ---- Fit bounds on first data load ----------------------------- */
  useEffect(() => {
    if (hasFittedBounds.current) return
    const map = mapRef.current
    if (!map || !isMapReady.current || !geoData?.features?.length) return

    hasFittedBounds.current = true
    const bounds = new maplibregl.LngLatBounds()
    geoData.features.forEach(f => {
      bounds.extend(f.geometry.coordinates as [number, number])
    })
    map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 1000 })
  }, [geoData])

  /* ---- Update source when data or selection changes -------------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady.current) return

    // If source doesn't exist yet, wait
    if (!map.getSource('trees-source')) return

    updateMapSource(map)
  }, [geoData, selectedRecordNumber, updateMapSource])

  /* ---- Flash markers for tree placement visual feedback ---------- */
  const [flashMarkers, setFlashMarkers] = useState<Array<{ id: number; x: number; y: number }>>([])

  const addFlashMarker = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random()
    setFlashMarkers((prev) => [...prev, { id, x, y }])
    // Remove after animation completes (800ms)
    setTimeout(() => {
      setFlashMarkers((prev) => prev.filter((m) => m.id !== id))
    }, 900)
  }, [])

  /* ---- Handle click: place mode or select ------------------------ */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (placeMode) {
        // Insert new tree at click location
        const { lat, lng } = e.lngLat
        // Show visual feedback flash at click point
        addFlashMarker(e.point.x, e.point.y)
        createMutateRef.current?.({ lat, lng })
        return
      }

      if (measureModeRef.current) {
        // Add measurement point
        const { lat, lng } = e.lngLat
        setMeasurePoints((prev) => [...prev, { lat, lng }])
        return
      }

      // Check if we clicked on a tree point
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['trees-layer', 'selected-tree-layer'],
      })

      if (features.length > 0) {
        const rn = features[0].properties?.recordNumber
        if (rn != null) {
          setSelectedRecordNumber(Number(rn))
        }
      } else {
        setSelectedRecordNumber(null)
      }
    }

    const handleClusterClick = (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters-layer'],
      })

      if (features.length > 0) {
        const clusterId = features[0].id
        const sc = superclusterRef.current
        if (sc && clusterId != null) {
          const zoom = sc.getClusterExpansionZoom(Number(clusterId))
          const geom = features[0].geometry
          if (geom.type !== 'Point') return
          const center = geom.coordinates
          map.flyTo({
            center: center as [number, number],
            zoom,
            duration: 400,
          })
        }
      }
    }

    map.on('click', handleMapClick)
    map.on('click', handleClusterClick)

    return () => {
      map.off('click', handleMapClick)
      map.off('click', handleClusterClick)
    }
  }, [placeMode, addFlashMarker, setSelectedRecordNumber])

  /* ---- Cursor style based on place/measure mode ------------------ */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (placeMode) {
      map.getCanvas().style.cursor = 'crosshair'
    } else if (measureMode) {
      map.getCanvas().style.cursor = 'crosshair'
    } else {
      map.getCanvas().style.cursor = ''
    }
  }, [placeMode, measureMode])

  /* ---- Track mouse coordinates + bearing ------------------------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      pendingCursorCoordRef.current = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      if (cursorCoordFrameRef.current !== null) return

      cursorCoordFrameRef.current = window.requestAnimationFrame(() => {
        cursorCoordFrameRef.current = null
        const coord = pendingCursorCoordRef.current
        if (!coord) return

        const key = `${coord.lat.toFixed(4)},${coord.lng.toFixed(4)}`
        if (key === lastCursorCoordKeyRef.current) return
        lastCursorCoordKeyRef.current = key
        setCursorCoord(coord)
      })
    }
    const onMouseOut = () => {
      pendingCursorCoordRef.current = null
      lastCursorCoordKeyRef.current = null
      if (cursorCoordFrameRef.current !== null) {
        window.cancelAnimationFrame(cursorCoordFrameRef.current)
        cursorCoordFrameRef.current = null
      }
      setCursorCoord(null)
    }

    map.on('mousemove', onMouseMove)
    map.on('mouseout', onMouseOut)

    return () => {
      if (cursorCoordFrameRef.current !== null) {
        window.cancelAnimationFrame(cursorCoordFrameRef.current)
        cursorCoordFrameRef.current = null
      }
      map.off('mousemove', onMouseMove)
      map.off('mouseout', onMouseOut)
    }
  }, [])

  /* ---- Fly to selected record ------------------------------------ */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady.current || selectedRecordNumber == null) return

    // Find the feature in the raw data
    const feature = geoData?.features?.find(
      (f) => f.properties.recordNumber === selectedRecordNumber
    )
    if (feature) {
      const [lng, lat] = feature.geometry.coordinates
      map.flyTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), 14),
        duration: 800,
      })
    }
  }, [selectedRecordNumber, geoData])

  /* ---- Draggable marker for selected tree ------------------------ */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady.current) return

    // Remove existing marker
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove()
      selectedMarkerRef.current = null
    }

    if (selectedRecordNumber == null) return

    // Find the feature
    const feature = geoData?.features?.find(
      (f) => f.properties.recordNumber === selectedRecordNumber
    )
    if (!feature) return

    const [lng, lat] = feature.geometry.coordinates

    // Create a custom marker element
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
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.remove()
        selectedMarkerRef.current = null
      }
    }
  }, [selectedRecordNumber, geoData, updateMutation])

  /* ---- Undo (Ctrl+Z) -------------------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 'z' &&
        lastInsertedRecordNumber != null
      ) {
        e.preventDefault()
        fetch(`/api/records/${lastInsertedRecordNumber}`, {
          method: 'DELETE',
        }).then(() => {
          setLastInsertedRecordNumber(null)
          queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
          queryClient.invalidateQueries({ queryKey: ['records'] })
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lastInsertedRecordNumber, setLastInsertedRecordNumber, queryClient])

  /* ---- Map style ----------------------------------------------- */
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('osm')

  const handleStyleChange = useCallback((style: MapStyleKey) => {
    setMapStyle(style)
    const map = mapRef.current
    if (map) {
      map.setStyle(getMapStyle(style) as unknown as maplibregl.StyleSpecification)
      // Need to re-add sources/layers after style change
      map.once('style.load', () => {
        if (!map.getSource('trees-source')) {
          map.addSource('trees-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          })
          // Re-add layers
          map.addLayer({
            id: 'clusters-layer', type: 'circle', source: 'trees-source',
            filter: ['==', ['get', 'cluster'], true],
            paint: {
              'circle-color': ['step', ['get', 'point_count'], MAP_COLORS.cluster[0], 10, MAP_COLORS.cluster[1], 50, MAP_COLORS.cluster[2], 200, MAP_COLORS.cluster[3]],
              'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 30, 200, 36],
              'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.9,
            },
          })
          map.addLayer({
            id: 'cluster-count-layer', type: 'symbol', source: 'trees-source',
            filter: ['==', ['get', 'cluster'], true],
            layout: { 'text-field': ['get', 'point_count'], 'text-font': ['Open Sans Bold'], 'text-size': 13 },
            paint: { 'text-color': '#ffffff' },
          })
          map.addLayer({
            id: 'trees-layer', type: 'circle', source: 'trees-source',
            filter: ['!=', ['get', 'cluster'], true],
            paint: { 'circle-color': MAP_COLORS.point, 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
          })
          map.addLayer({
            id: 'selected-tree-layer', type: 'circle', source: 'trees-source',
            filter: ['==', ['get', 'selected'], true],
            paint: { 'circle-color': MAP_COLORS.point, 'circle-radius': 9, 'circle-stroke-width': 3, 'circle-stroke-color': MAP_COLORS.pointSelectedStroke },
          })

          // Re-add heatmap source + layer (hidden by default; will be shown if layerMode is heatmap)
          addHeatmapToMap(map, false)

          // Re-add measurement source + layers
          if (!map.getSource('measure-source')) {
            map.addSource('measure-source', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] },
            })
            map.addLayer({
              id: 'measure-line-layer', type: 'line', source: 'measure-source',
              paint: { 'line-color': '#ef4444', 'line-width': 2, 'line-dasharray': [4, 3] },
            })
            map.addLayer({
              id: 'measure-points-layer', type: 'circle', source: 'measure-source',
              filter: ['==', ['get', 'measurePoint'], true],
              paint: { 'circle-color': '#ef4444', 'circle-radius': 5, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
            })
          }

          // Reset layer mode to points on style change (layers are recreated in default visibility)
          setLayerMode('points')

          // Trigger data update
          updateMapSourceRef.current(map)
        }
      })
    }
  }, [])

  /* ---- Layer mode toggle handler -------------------------------- */
  const POINT_LAYER_IDS = ['clusters-layer', 'cluster-count-layer', 'trees-layer', 'selected-tree-layer'] as const
  const HEATMAP_LAYER_ID = 'heatmap-layer'

  const handleLayerModeToggle = useCallback(() => {
    const map = mapRef.current
    if (!map) return

    const newMode: LayerMode = layerMode === 'points' ? 'heatmap' : 'points'
    setLayerMode(newMode)

    if (newMode === 'heatmap') {
      // Hide point layers, show heatmap
      POINT_LAYER_IDS.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none')
        }
      })
      if (map.getLayer(HEATMAP_LAYER_ID)) {
        map.setLayoutProperty(HEATMAP_LAYER_ID, 'visibility', 'visible')
      }
    } else {
      // Show point layers, hide heatmap
      POINT_LAYER_IDS.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'visible')
        }
      })
      if (map.getLayer(HEATMAP_LAYER_ID)) {
        map.setLayoutProperty(HEATMAP_LAYER_ID, 'visibility', 'none')
      }
    }
  }, [layerMode])

  /* ---- Update measurement GeoJSON source ------------------------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady.current) return
    if (!map.getSource('measure-source')) return

    const features: Array<GeoJSON.Feature> = []

    // Add point features
    measurePoints.forEach((pt, idx) => {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
        properties: { measurePoint: true, index: idx },
      })
    })

    // Add line feature if 2+ points
    if (measurePoints.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: measurePoints.map((pt) => [pt.lng, pt.lat]),
        },
        properties: { measureLine: true },
      })
    }

    ;(map.getSource('measure-source') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features,
    })
  }, [measurePoints])

  /* ---- Grid overlay toggle (G key) ---------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'g' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        setGridVisible((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  /* ---- Update selected tree info panel (derived as useMemo) ---- */
  const selectedTreeInfo = useMemo(() => {
    if (selectedRecordNumber == null || !geoData?.features) return null
    const feature = geoData.features.find(
      (f) => f.properties.recordNumber === selectedRecordNumber
    )
    if (!feature) return null
    return {
      species: feature.properties.speciesLatin,
      date: feature.properties.plantedAt ? format(new Date(feature.properties.plantedAt), 'd.M.yyyy') : '',
      locality: feature.properties.locality,
      recordNumber: feature.properties.recordNumber,
    }
  }, [selectedRecordNumber, geoData])

  /* ---- Resize handler -------------------------------------------- */
  useEffect(() => {
    const handleResize = () => {
      mapRef.current?.resize()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isGeoLoading = !geoData

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
      />
    </div>
  )
}
