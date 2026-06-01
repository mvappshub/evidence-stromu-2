# Task 5-d: Map Heatmap Layer Toggle & Map Legend

## Work Log

### Feature 1: Map Heatmap Layer Toggle

- Created `src/components/map/HeatmapToggle.tsx`:
  - Controlled presentational component accepting `mode` (LayerMode) and `onToggle` callback
  - Exports `LayerMode` type ('points' | 'heatmap') for shared use
  - Uses Flame icon when heatmap is active, CircleDot when points are active
  - Green accent styling when heatmap is active (bg-green-100/border-green-300, dark mode support)
  - Styled identically to MapStyleSwitcher (size-8, shadow-md, border, backdrop-blur)
  - Tooltip shows "Teplotní mapa hustoty" / "Bodová vrstva stromů"

- Updated `src/components/map/MapView.tsx`:
  - Added `addHeatmapToMap()` helper function that adds:
    - `trees-source-heatmap` GeoJSON source (same data as trees-source but unclustered)
    - `heatmap-layer` with MapLibre heatmap paint properties:
      - Color gradient: transparent → green-500 (20%/40%) → lime-600 (60%) → yellow-600 (80%) → red-500 (100%)
      - Radius interpolated by zoom: 5 (z0) → 15 (z10) → 25 (z14)
      - Intensity interpolated by zoom: 1 (z0) → 3 (z14)
      - Opacity 0.7
    - Hidden by default (visibility: 'none')
  - Added `layerMode` state (LayerMode) controlled by MapView
  - Added `handleLayerModeToggle` callback that:
    - Toggles between 'points' and 'heatmap' modes
    - Uses `map.setLayoutProperty()` to show/hide appropriate layers
    - Point layers (clusters, cluster-count, trees, selected-tree) hidden in heatmap mode
    - Heatmap layer shown in heatmap mode, hidden in points mode
  - Added `useEffect` to update `trees-source-heatmap` data when `geoData` changes
  - Added `addHeatmapToMap(map, false)` in initial map load and in `handleStyleChange`
  - Resets `layerMode` to 'points' on style change (layers recreated in default visibility)
  - Positioned HeatmapToggle next to MapStyleSwitcher in top-right flex container

### Feature 2: Map Legend / Info Panel

- Created `src/components/map/MapLegend.tsx`:
  - Collapsible panel in bottom-right corner of map (above scale control)
  - Toggleable with small Info icon button (size-7, green accent when open)
  - Shows different content based on `layerMode` prop:
    - Points mode: Green circle = "Strom", Green circle with number = "Shluk (X stromů)", Gold-bordered circle = "Vybraný strom"
    - Heatmap mode: Gradient bar (green→yellow→red) with "Málo" and "Hodně" labels, "Hustota stromů" header
  - Compact design: max-w-[160px], text-[11px], small text
  - bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg
  - ChevronDown button to close
  - Czech labels throughout

### Integration

- Both components integrated into MapView.tsx
- HeatmapToggle and MapStyleSwitcher in a flex row at top-right
- MapLegend positioned absolute bottom-8 right-3
- Layer mode state flows: MapView → HeatmapToggle (mode), HeatmapToggle → MapView (onToggle), MapView → MapLegend (layerMode)

## Stage Summary

- Map heatmap toggle fully implemented with native MapLibre heatmap layer
- Map legend with context-aware content (points vs heatmap mode)
- Style changes properly recreate heatmap layer and reset to points mode
- Heatmap data source synced with geoData changes
- Lint: 0 errors, 3 pre-existing warnings
- Dev server compiles and runs correctly
