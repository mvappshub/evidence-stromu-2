'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useQuery } from '@tanstack/react-query'
import { Database, ZoomIn } from 'lucide-react'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { czechPlural } from '@/lib/czech-plural'
import { useUiStore } from '@/store/useUiStore'

export function StatusBar() {
  const { user } = useAuthStore()
  const { data: countData, isError } = useQuery({
    queryKey: ['records-count-status'],
    queryFn: async () => {
      const res = await fetch('/api/records?limit=1')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      return data.count as number
    },
    staleTime: 30_000,
    refetchInterval: 120_000,
  })

  const viewMode = useUiStore((s) => s.viewMode)

  return (
    <div className="h-7 border-t glass-bar flex items-center px-3 gap-3 text-[10px] text-muted-foreground shrink-0 z-20 relative">
      {/* Sweep progress bar for refresh cycle */}
      <div className="sweep-progress" />

      <span className="flex items-center gap-1.5">
        <Database className="size-3 text-green-600/70 dark:text-green-400/70" />
        {countData !== undefined ? `${czechPlural(countData, ['strom', 'stromy', 'stromů'])} v databázi` : 'SQLite'}
      </span>
      <div className="status-separator" />
      {/* key prop triggers CSS animation replay on status change */}
      <span className="flex items-center gap-1.5" key={isError ? 'err' : 'ok'}>
        {isError ? (
          <>
            <span className="size-1.5 rounded-full bg-red-500 status-dot-disconnected status-bounce" />
            Odpojeno
          </>
        ) : (
          <>
            <span className="size-1.5 rounded-full bg-green-500 status-dot-connected status-bounce" />
            Připojeno
          </>
        )}
      </span>
      <div className="status-separator" />

      {/* Map zoom level when in map view */}
      {(viewMode === 'map' || viewMode === 'both') && (
        <>
          <ZoomLevelIndicator />
          <div className="status-separator" />
        </>
      )}

      <div className="flex-1" />
      <span className="text-muted-foreground/40">v1.0.0</span>
      <div className="status-separator" />
      <span className="tabular-nums time-display">
        {format(new Date(), 'd. MMMM yyyy, H:mm', { locale: cs })}
      </span>
      {user?.email && (
        <>
          <div className="status-separator" />
          <span className="hidden sm:inline text-muted-foreground/80">
            {user.email}
          </span>
        </>
      )}
    </div>
  )
}

/** Sub-component that reads the MapLibre zoom level from the DOM */
function ZoomLevelIndicator() {
  const [zoom, setZoom] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Poll the MapLibre canvas for zoom level
    intervalRef.current = setInterval(() => {
      const mapEl = document.querySelector('.maplibregl-map')
      if (mapEl) {
        // Try to read zoom from the map's internal state via the canvas data
        const zoomLabel = document.querySelector('.maplibregl-ctrl-scale')?.textContent
        // We can't easily get zoom from DOM, but we can check for the map container
        // and approximate from the map instance if available
        try {
          const mapContainer = mapEl as HTMLElement & { __mapInstance?: { getZoom: () => number } }
          if (mapContainer.__mapInstance) {
            setZoom(Math.round(mapContainer.__mapInstance.getZoom() * 10) / 10)
          }
        } catch {
          // Ignore - map instance not accessible
        }
      }
    }, 2000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (zoom === null) return null

  return (
    <span className="flex items-center gap-1">
      <ZoomIn className="size-3 text-green-600/50 dark:text-green-400/50" />
      <span className="tabular-nums">{zoom}×</span>
    </span>
  )
}
