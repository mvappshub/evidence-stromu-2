'use client'

import { useEffect, useRef, useState } from 'react'
import type maplibregl from 'maplibre-gl'

export function useMapCursor(map: maplibregl.Map | null) {
  const [cursorCoord, setCursorCoord] = useState<{ lat: number; lng: number } | null>(null)

  const cursorCoordFrameRef = useRef<number | null>(null)
  const pendingCursorCoordRef = useRef<{ lat: number; lng: number } | null>(null)
  const lastCursorCoordKeyRef = useRef<string | null>(null)

  useEffect(() => {
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
      }
      map.off('mousemove', onMouseMove)
      map.off('mouseout', onMouseOut)
    }
  }, [map])

  return { cursorCoord }
}
