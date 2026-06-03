'use client'

import { TreePine, Ruler, X } from 'lucide-react'
import { MapStyleSwitcher } from './MapStyleSwitcher'
import type { MapStyleKey } from './MapStyleSwitcher'
import { HeatmapToggle } from './HeatmapToggle'
import type { LayerMode } from './HeatmapToggle'
import { MapLegend } from './MapLegend'
import { MapPlaceSearch } from './MapPlaceSearch'
import { MapLayerPanel } from './MapLayerPanel'
import { MapIdentifyCard } from './MapIdentifyCard'
import { formatDistance } from '@/lib/haversine'
import type { ParcelIdentifyResult } from '@/lib/wms-feature-info'

export interface SelectedTreeInfo {
  recordNumber: number
  species: string
  date: string
  locality: string | null
}

export interface MapOverlaysProps {
  isGeoLoading: boolean
  featureCount: number
  mapStyle: MapStyleKey
  onStyleChange: (style: MapStyleKey) => void
  layerMode: LayerMode
  onLayerModeToggle: () => void
  measureMode: boolean
  onToggleMeasureMode: () => void
  measurePoints: Array<{ lat: number; lng: number }>
  totalMeasureDistance: number
  onClearMeasurePoints: () => void
  cursorCoord: { lat: number; lng: number } | null
  flashMarkers: Array<{ id: number; x: number; y: number }>
  gridVisible: boolean
  selectedTreeInfo: SelectedTreeInfo | null
  parcelInfo?: ParcelIdentifyResult | null
  identifyLoading?: boolean
  onCloseIdentify?: () => void
}

export function MapOverlays({
  isGeoLoading,
  featureCount,
  mapStyle,
  onStyleChange,
  layerMode,
  onLayerModeToggle,
  measureMode,
  onToggleMeasureMode,
  measurePoints,
  totalMeasureDistance,
  onClearMeasurePoints,
  cursorCoord,
  flashMarkers,
  gridVisible,
  selectedTreeInfo,
  parcelInfo = null,
  identifyLoading = false,
  onCloseIdentify,
}: MapOverlaysProps) {
  return (
    <>
      {isGeoLoading && <div className="map-loading-shimmer" />}

      <MapPlaceSearch />

      <MapIdentifyCard
        parcelInfo={parcelInfo}
        loading={identifyLoading}
        onClose={() => onCloseIdentify?.()}
      />

      <div className="absolute top-1 right-1 z-10 flex items-center gap-px bg-toolbar border border-border p-px">
        <MapStyleSwitcher currentStyle={mapStyle} onStyleChange={onStyleChange} />
        <HeatmapToggle mode={layerMode} onToggle={onLayerModeToggle} />
        <MapLegend layerMode={layerMode} mapStyle={mapStyle} />
        <MapLayerPanel />
        <button
          type="button"
          onClick={onToggleMeasureMode}
          className={`size-6 flex items-center justify-center border-l border-border ${
            measureMode
              ? 'bg-destructive/20 text-destructive'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
          title="Měření vzdálenosti"
        >
          <Ruler className="size-3" />
        </button>
      </div>

      {measureMode && measurePoints.length > 0 && (
        <div className="absolute top-8 right-1 z-10 bg-toolbar border border-border p-2 min-w-[140px] text-[11px]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">Měření vzdálenosti</span>
            <button
              type="button"
              onClick={onClearMeasurePoints}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Vymazat body"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="text-sm font-mono tabular-nums text-destructive">
            {formatDistance(totalMeasureDistance)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {measurePoints.length}{' '}
            {measurePoints.length === 1
              ? 'bod'
              : measurePoints.length < 5
                ? 'body'
                : 'bodů'}
          </div>
        </div>
      )}

      {cursorCoord && (
        <div
          className="absolute bottom-9 left-1 z-10 coord-display"
          key={`${cursorCoord.lat.toFixed(3)},${cursorCoord.lng.toFixed(3)}`}
        >
          {cursorCoord.lat.toFixed(5)}, {cursorCoord.lng.toFixed(5)}
        </div>
      )}

      {flashMarkers.map((marker) => (
        <div
          key={marker.id}
          className="tree-flash-marker"
          style={{ left: marker.x, top: marker.y }}
        />
      ))}

      {gridVisible && (
        <div className="grid-overlay">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="lat-grid" width="100%" height="50" patternUnits="userSpaceOnUse">
                <line
                  x1="0"
                  y1="50"
                  x2="100%"
                  y2="50"
                  stroke="oklch(0.55 0.1 250 / 0.15)"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
              </pattern>
              <pattern id="lng-grid" width="50" height="100%" patternUnits="userSpaceOnUse">
                <line
                  x1="50"
                  y1="0"
                  x2="50"
                  y2="100%"
                  stroke="oklch(0.55 0.1 250 / 0.15)"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lat-grid)" />
            <rect width="100%" height="100%" fill="url(#lng-grid)" />
          </svg>
        </div>
      )}

      {featureCount === 0 && !isGeoLoading && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="text-center space-y-3 max-w-sm px-4">
            <TreePine className="size-8 mx-auto text-muted-foreground" />
            <h3 className="text-base font-medium">Žádné stromy na mapě</h3>
            <p className="text-sm text-muted-foreground">
              Zapněte <strong>Vkládat</strong> dole a klikněte na mapu pro nový záznam. Zkratky: <kbd className="px-1 rounded border bg-muted text-[10px] font-mono">?</kbd>
            </p>
          </div>
        </div>
      )}

      {selectedTreeInfo && (
        <div className="absolute top-10 left-1 z-10 mini-info-panel slide-up-info max-w-[220px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-primary font-semibold">
              #{selectedTreeInfo.recordNumber}
            </span>
            <span className="text-sm italic font-medium truncate">{selectedTreeInfo.species}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>📅 {selectedTreeInfo.date}</span>
            {selectedTreeInfo.locality && <span>📍 {selectedTreeInfo.locality}</span>}
          </div>
        </div>
      )}
    </>
  )
}
