import { create } from 'zustand'
import type { LayerMode } from '@/lib/map-types'
import type { MapStyleKey } from '@/lib/map-basemaps'
import type { MapRestoreContext } from '@/lib/map-layer-restore'
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
  radarVisible: boolean
  toggleOverlay: (id: MapOverlayId) => void
  setOverlay: (id: MapOverlayId, visible: boolean) => void
  toggleOsmTrees: () => void
  toggleRadar: () => void
}

export const useMapLayerStore = create<MapLayerState>((set) => ({
  overlayVisibility: { ...DEFAULT_OVERLAY_VISIBILITY },
  osmTreesVisible: false,
  radarVisible: false,
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
  toggleRadar: () => set((state) => ({ radarVisible: !state.radarVisible })),
}))

export function getRestoreContextFromStore(
  mapStyle: MapStyleKey,
  layerMode: LayerMode
): MapRestoreContext {
  const { overlayVisibility, osmTreesVisible, radarVisible } = useMapLayerStore.getState()
  return { mapStyle, layerMode, overlayVisibility, osmTreesVisible, radarVisible }
}
