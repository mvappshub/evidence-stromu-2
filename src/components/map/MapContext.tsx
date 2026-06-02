'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [bearing, setBearing] = useState(0)

  const setMap = useCallback((map: maplibregl.Map | null) => {
    mapRef.current = map
  }, [])

  const value = useMemo(
    () => ({
      get map() {
        return mapRef.current
      },
      setMap,
      bearing,
      setBearing,
    }),
    [setMap, bearing]
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
