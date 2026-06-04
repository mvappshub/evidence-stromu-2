import { create } from 'zustand'
import type { LatLng } from '@/lib/geodesic-line-points'
import {
  createLinePlaceActions,
  initialLinePlaceState,
  type LinePlacePhase,
} from '@/store/line-place-state'

export const LINE_SPACING_PRESETS_M = [1, 2, 3, 5, 10] as const

type MapToolMode = 'place' | 'measure' | 'linePlace' | null

function deactivateOthers(mode: MapToolMode): Pick<
  PlantState,
  'placeMode' | 'measureMode' | 'linePlaceMode'
> {
  return {
    placeMode: mode === 'place',
    measureMode: mode === 'measure',
    linePlaceMode: mode === 'linePlace',
  }
}

interface PlantState {
  activeSpecies: string
  activeDate: string
  activeLocality: string

  placeMode: boolean
  measureMode: boolean
  linePlaceMode: boolean
  lineSpacingMeters: number
  linePlaceVertices: LatLng[]
  linePlacePreview: LatLng[] | null
  linePlacePhase: LinePlacePhase
  linePlacePreviewTruncated: boolean

  recentSpecies: string[]
  lastInsertedRecordNumber: number | null

  setActiveSpecies: (species: string) => void
  setActiveDate: (date: string) => void
  setActiveLocality: (locality: string) => void
  setMapToolMode: (mode: MapToolMode) => void
  setPlaceMode: (on: boolean) => void
  togglePlaceMode: () => void
  setMeasureMode: (on: boolean) => void
  toggleMeasureMode: () => void
  setLinePlaceMode: (on: boolean) => void
  toggleLinePlaceMode: () => void
  setLineSpacingMeters: (meters: number) => void
  resetLinePlace: () => void
  addLinePlaceVertex: (pt: LatLng) => void
  setLinePlacePreview: (points: LatLng[], truncated: boolean) => void
  clearLinePlacePreview: () => void
  addToRecentSpecies: (species: string) => void
  setLastInsertedRecordNumber: (n: number | null) => void
}

export const usePlantStore = create<PlantState>((set, get) => ({
  activeSpecies: '',
  activeDate: new Date().toISOString().split('T')[0],
  activeLocality: '',
  placeMode: false,
  measureMode: false,
  linePlaceMode: false,
  lineSpacingMeters: 2,
  ...initialLinePlaceState,
  recentSpecies: [],
  lastInsertedRecordNumber: null,

  setActiveSpecies: (species) =>
    set((state) => {
      const updated = [species, ...state.recentSpecies.filter((s) => s !== species)].slice(
        0,
        10
      )
      return { activeSpecies: species, recentSpecies: updated }
    }),
  setActiveDate: (date) => set({ activeDate: date }),
  setActiveLocality: (locality) => set({ activeLocality: locality }),

  setMapToolMode: (mode) => set(deactivateOthers(mode)),

  setPlaceMode: (on) => set(deactivateOthers(on ? 'place' : null)),
  togglePlaceMode: () => {
    const on = !get().placeMode
    set(deactivateOthers(on ? 'place' : null))
  },

  setMeasureMode: (on) => set(deactivateOthers(on ? 'measure' : null)),
  toggleMeasureMode: () => {
    const on = !get().measureMode
    set(deactivateOthers(on ? 'measure' : null))
  },

  setLinePlaceMode: (on) => {
    set(deactivateOthers(on ? 'linePlace' : null))
    if (on) {
      set({ ...initialLinePlaceState, linePlacePhase: 'drawing' })
    } else {
      get().resetLinePlace()
    }
  },
  toggleLinePlaceMode: () => {
    const on = !get().linePlaceMode
    get().setLinePlaceMode(on)
  },

  setLineSpacingMeters: (meters) =>
    set({ lineSpacingMeters: Math.max(0.5, Math.min(100, meters)) }),

  ...createLinePlaceActions(set),

  addToRecentSpecies: (species) =>
    set((state) => {
      const updated = [species, ...state.recentSpecies.filter((s) => s !== species)].slice(
        0,
        10
      )
      return { recentSpecies: updated }
    }),
  setLastInsertedRecordNumber: (n) => set({ lastInsertedRecordNumber: n }),
}))
