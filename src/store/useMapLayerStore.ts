import { create } from 'zustand'
import type { MapOverlayId } from '@/lib/map-wms-definitions'

const DEFAULT_OVERLAY_VISIBILITY: Record<MapOverlayId, boolean> = {
  parcels: false,
  transport: false,
  utilities: false,
  admin: false,
}

interface MapLayerState {
  overlayVisibility: Record<MapOverlayId, boolean>
  osmTreesVisible: boolean
  toggleOverlay: (id: MapOverlayId) => void
  setOverlay: (id: MapOverlayId, visible: boolean) => void
  toggleOsmTrees: () => void
}

export const useMapLayerStore = create<MapLayerState>((set) => ({
  overlayVisibility: { ...DEFAULT_OVERLAY_VISIBILITY },
  osmTreesVisible: false,
  toggleOverlay: (id) =>
    set((state) => ({
      overlayVisibility: {
        ...state.overlayVisibility,
        [id]: !state.overlayVisibility[id],
      },
    })),
  setOverlay: (id, visible) =>
    set((state) => ({
      overlayVisibility: { ...state.overlayVisibility, [id]: visible },
    })),
  toggleOsmTrees: () => set((state) => ({ osmTreesVisible: !state.osmTreesVisible })),
}))

export function getRestoreContextFromStore(
  mapStyle: import('@/lib/map-basemaps').MapStyleKey,
  layerMode: import('@/components/map/HeatmapToggle').LayerMode
): import('@/lib/map-layer-restore').MapRestoreContext {
  const { overlayVisibility, osmTreesVisible } = useMapLayerStore.getState()
  return { mapStyle, layerMode, overlayVisibility, osmTreesVisible }
}
