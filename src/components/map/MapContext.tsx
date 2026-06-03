'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type maplibregl from 'maplibre-gl'

interface MapContextValue {
  map: maplibregl.Map | null
  setMap: (map: maplibregl.Map | null) => void
  bearing: number
  setBearing: (b: number) => void
}

const MapContext = createContext<MapContextValue | null>(null)

export function MapProvider({ children }: { children: ReactNode }) {
  const [map, setMapInstance] = useState<maplibregl.Map | null>(null)
  const [bearing, setBearing] = useState(0)

  const setMap = useCallback((next: maplibregl.Map | null) => {
    setMapInstance(next)
  }, [])

  const value = useMemo(
    () => ({
      map,
      setMap,
      bearing,
      setBearing,
    }),
    [map, setMap, bearing]
  )

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>
}

export function useMapContext() {
  const ctx = useContext(MapContext)
  if (!ctx) {
    throw new Error('useMapContext must be used within MapProvider')
  }
  return ctx
}

/** Optional hook for components outside map that only need zoom when map exists */
export function useMapContextOptional() {
  return useContext(MapContext)
}
