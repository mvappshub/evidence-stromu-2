'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Supercluster from 'supercluster'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { TreePine, Ruler, X } from 'lucide-react'
import { useUiStore } from '@/store/useUiStore'
import { usePlantStore } from '@/store/usePlantStore'
import { MapStyleSwitcher, getMapStyle } from './MapStyleSwitcher'
import type { MapStyleKey } from './MapStyleSwitcher'
import { HeatmapToggle } from './HeatmapToggle'
import type { LayerMode } from './HeatmapToggle'
import { MapLegend } from './MapLegend'
import { toast } from 'sonner'
import { haversineDistance, formatDistance } from '@/lib/haversine'

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
          0, 'rgba(0, 0, 0, 0)',
          0.2, 'rgba(34, 197, 94, 0.2)',
          0.4, 'rgba(34, 197, 94, 0.4)',
          0.6, 'rgba(132, 204, 22, 0.6)',
          0.8, 'rgba(234, 179, 8, 0.8)',
          1, 'rgba(239, 68, 68, 0.9)',
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
  const hasFittedBounds = useRef(false)
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null)
  const updateMutateRef = useRef<((args: { recordNumber: number; lat: number; lng: number }) => void) | null>(null)

  const selectedRecordNumber = useUiStore((s) => s.selectedRecordNumber)
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const speciesFilter = useUiStore((s) => s.speciesFilter)
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
  const [mapBearing, setMapBearing] = useState(0)
  const [gridVisible, setGridVisible] = useState(false)

  /* ---- Data fetching --------------------------------------------- */
  const geojsonQueryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (speciesFilter) params.set('species', speciesFilter)
    return params.toString()
  }, [speciesFilter])

  const { data: geoData } = useQuery<GeoJsonResponse>({
    queryKey: ['records-geojson', geojsonQueryParams],
    queryFn: async () => {
      const res = await fetch(`/api/records/geojson?${geojsonQueryParams}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  /* ---- Create record mutation ------------------------------------ */
  const createMutation = useMutation({
    mutationFn: async (data: { lat: number; lng: number }) => {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          speciesLatin: activeSpecies,
          plantedAt: activeDate,
          locality: activeLocality || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
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
    onError: () => {
      toast.error('Chyba', { description: 'Nepodařilo se vložit strom' })
    },
  })

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
      heatmapData as maplibregl.GeoJSONSourceOptions['data']
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

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

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
            '#86efac',
            10,
            '#4ade80',
            50,
            '#22c55e',
            200,
            '#16a34a',
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
          'circle-color': '#22c55e',
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
          'circle-color': '#22c55e',
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

    return () => {
      map.remove()
      mapRef.current = null
      isMapReady.current = false
    }
  }, [])

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
        createMutation.mutate({ lat, lng })
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
          const center = features[0].geometry.coordinates
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
  }, [placeMode, createMutation, setSelectedRecordNumber, setMeasurePoints])

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
      setCursorCoord({ lat: e.lngLat.lat, lng: e.lngLat.lng })
    }
    const onMouseOut = () => setCursorCoord(null)
    const onRotate = () => setMapBearing(map.getBearing())

    map.on('mousemove', onMouseMove)
    map.on('mouseout', onMouseOut)
    map.on('rotate', onRotate)

    return () => {
      map.off('mousemove', onMouseMove)
      map.off('mouseout', onMouseOut)
      map.off('rotate', onRotate)
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
    el.style.backgroundColor = '#22c55e'
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
      map.setStyle(getMapStyle(style) as maplibregl.StyleSpecification)
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
              'circle-color': ['step', ['get', 'point_count'], '#86efac', 10, '#4ade80', 50, '#22c55e', 200, '#16a34a'],
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
            paint: { 'circle-color': '#22c55e', 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
          })
          map.addLayer({
            id: 'selected-tree-layer', type: 'circle', source: 'trees-source',
            filter: ['==', ['get', 'selected'], true],
            paint: { 'circle-color': '#22c55e', 'circle-radius': 9, 'circle-stroke-width': 3, 'circle-stroke-color': '#eab308' },
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

          // Re-add hover handlers
          map.on('mousemove', 'trees-layer', (e) => {
            if (e.features && e.features.length > 0) {
              const feat = e.features[0]
              const props = feat.properties!
              map.getCanvas().style.cursor = placeModeRef.current ? 'crosshair' : 'pointer'
              const coordinates = (feat.geometry as any).coordinates.slice()
              const date = props.plantedAt ? format(new Date(props.plantedAt), 'd.M.yyyy') : ''
              const locality = props.locality ? `<br/>📍 ${props.locality}` : ''
              if (popupRef.current) popupRef.current.remove()
              popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: 'tree-popup' })
                .setLngLat(coordinates)
                .setHTML(`<div style="font-size:12px"><em>${props.speciesLatin}</em><br/>📅 ${date}${locality}</div>`)
                .addTo(map)
            }
          })
          map.on('mouseleave', 'trees-layer', () => {
            map.getCanvas().style.cursor = placeModeRef.current ? 'crosshair' : ''
            if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }
          })
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

  /* ---- Expose map instance for StatusBar zoom level ------------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const container = map.getContainer()
    ;(container as HTMLElement & { __mapInstance?: object }).__mapInstance = map
  }, [geoData])

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

      {/* Vignette overlay */}
      <div className="absolute inset-0 map-vignette z-[1]" />

      {/* Loading shimmer */}
      {isGeoLoading && <div className="map-loading-shimmer" />}

      {/* Compass rose */}
      <div className="absolute top-3 left-3 z-10">
        <div
          className="compass-rose"
          style={{ transform: `rotate(${-mapBearing}deg)`, ['--compass-rotate' as string]: String(-mapBearing) }}
        >
          N
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <MapStyleSwitcher currentStyle={mapStyle} onStyleChange={handleStyleChange} className="style-switcher-fade-in" />
        <HeatmapToggle mode={layerMode} onToggle={handleLayerModeToggle} />
        <button
          type="button"
          onClick={toggleMeasureMode}
          className={`size-8 rounded-md border flex items-center justify-center transition-colors shadow-sm ${
            measureMode
              ? 'bg-red-500 border-red-600 text-white hover:bg-red-600'
              : 'bg-background/90 border-border text-muted-foreground hover:text-foreground hover:bg-background'
          }`}
          title="Měření vzdálenosti"
        >
          <Ruler className="size-3.5" />
        </button>
      </div>

      {/* Measurement distance panel */}
      {measureMode && measurePoints.length > 0 && (
        <div className="absolute top-14 right-3 z-10 bg-background/95 border border-border rounded-lg shadow-lg p-3 min-w-[160px]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">Měření vzdálenosti</span>
            <button
              type="button"
              onClick={clearMeasurePoints}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Vymazat body"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">
            {formatDistance(totalMeasureDistance)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {measurePoints.length} {measurePoints.length === 1 ? 'bod' : measurePoints.length < 5 ? 'body' : 'bodů'}
          </div>
        </div>
      )}
      <MapLegend layerMode={layerMode} />

      {/* Coordinate display */}
      {cursorCoord && (
        <div className="absolute bottom-14 left-3 z-10 coord-display coord-flash" key={`${cursorCoord.lat.toFixed(3)},${cursorCoord.lng.toFixed(3)}`}>
          {cursorCoord.lat.toFixed(5)}, {cursorCoord.lng.toFixed(5)}
        </div>
      )}

      {/* Flash markers for tree placement visual feedback */}
      {flashMarkers.map((marker) => (
        <div
          key={marker.id}
          className="tree-flash-marker"
          style={{ left: marker.x, top: marker.y }}
        />
      ))}
      {/* Grid overlay */}
      {gridVisible && (
        <div className="grid-overlay">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="lat-grid" width="100%" height="50" patternUnits="userSpaceOnUse">
                <line x1="0" y1="50" x2="100%" y2="50" stroke="oklch(0.55 0.15 145 / 0.15)" strokeWidth="0.5" strokeDasharray="4 4" />
              </pattern>
              <pattern id="lng-grid" width="50" height="100%" patternUnits="userSpaceOnUse">
                <line x1="50" y1="0" x2="50" y2="100%" stroke="oklch(0.55 0.15 145 / 0.15)" strokeWidth="0.5" strokeDasharray="4 4" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lat-grid)" />
            <rect width="100%" height="100%" fill="url(#lng-grid)" />
          </svg>
        </div>
      )}

      {/* Empty state overlay for new users */}
      {geoData?.features?.length === 0 && !isGeoLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="text-center space-y-3 max-w-sm px-4">
            <div className="size-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center pulse-tree-icon">
              <TreePine className="size-10 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Začněte evidovat stromy</h3>
            <p className="text-sm text-muted-foreground">
              Klikněte na tlačítko <strong>„Vkládat&quot;</strong> dole na mapě a poté klikněte na místo, kde byl strom vysazen.
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">P</kbd> Režim vkládání</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">?</kbd> Klávesové zkratky</span>
            </div>
          </div>
        </div>
      )}

      {/* Mini info panel for selected tree */}
      {selectedTreeInfo && (
        <div className="absolute bottom-14 right-3 z-10 mini-info-panel slide-up-info">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-green-600 dark:text-green-400 font-semibold">#{selectedTreeInfo.recordNumber}</span>
            <span className="text-sm italic font-medium truncate">{selectedTreeInfo.species}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>📅 {selectedTreeInfo.date}</span>
            {selectedTreeInfo.locality && <span>📍 {selectedTreeInfo.locality}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
