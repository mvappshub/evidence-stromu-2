'use client'

import { useEffect, useRef, useCallback, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Supercluster from 'supercluster'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUiStore } from '@/store/useUiStore'
import { usePlantStore } from '@/store/usePlantStore'

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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const superclusterRef = useRef<Supercluster | null>(null)
  const isMapReady = useRef(false)
  const updateMapSourceRef = useRef<(map: maplibregl.Map) => void>(() => {})

  const selectedRecordNumber = useUiStore((s) => s.selectedRecordNumber)
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const placeMode = usePlantStore((s) => s.placeMode)
  const activeSpecies = usePlantStore((s) => s.activeSpecies)
  const activeDate = usePlantStore((s) => s.activeDate)
  const activeLocality = usePlantStore((s) => s.activeLocality)
  const setLastInsertedRecordNumber = usePlantStore((s) => s.setLastInsertedRecordNumber)
  const lastInsertedRecordNumber = usePlantStore((s) => s.lastInsertedRecordNumber)
  const addToRecentSpecies = usePlantStore((s) => s.addToRecentSpecies)
  const queryClient = useQueryClient()

  /* ---- Data fetching --------------------------------------------- */
  const { data: geoData } = useQuery<GeoJsonResponse>({
    queryKey: ['records-geojson'],
    queryFn: async () => {
      const res = await fetch('/api/records/geojson')
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
      }
      if (activeSpecies) {
        addToRecentSpecies(activeSpecies)
      }
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      queryClient.invalidateQueries({ queryKey: ['records'] })
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
    },
  })

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

  /* ---- Initialize map -------------------------------------------- */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
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
            '#4ade80',
            10,
            '#22c55e',
            50,
            '#16a34a',
            200,
            '#15803d',
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
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
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
          'text-size': 12,
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
          'circle-radius': 8,
          'circle-stroke-width': 4,
          'circle-stroke-color': '#eab308',
        },
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

  /* ---- Update source when data or selection changes -------------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady.current) return

    // If source doesn't exist yet, wait
    if (!map.getSource('trees-source')) return

    updateMapSource(map)
  }, [geoData, selectedRecordNumber, updateMapSource])

  /* ---- Handle click: place mode or select ------------------------ */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (placeMode) {
        // Insert new tree at click location
        const { lat, lng } = e.lngLat
        createMutation.mutate({ lat, lng })
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
  }, [placeMode, createMutation, setSelectedRecordNumber])

  /* ---- Cursor style based on place mode -------------------------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.getCanvas().style.cursor = placeMode ? 'crosshair' : ''
  }, [placeMode])

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

  /* ---- Resize handler -------------------------------------------- */
  useEffect(() => {
    const handleResize = () => {
      mapRef.current?.resize()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return <div ref={mapContainer} className="w-full h-full" />
}
