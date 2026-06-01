import { create } from 'zustand'

interface PlantState {
  // Active planting context (sticky defaults)
  activeSpecies: string
  activeDate: string // ISO date string, default today
  activeLocality: string

  // Place mode toggle
  placeMode: boolean

  // Measure mode toggle (mutually exclusive with placeMode)
  measureMode: boolean

  // Recently used species for quick switching
  recentSpecies: string[]

  // Last inserted record number (for undo)
  lastInsertedRecordNumber: number | null

  // Actions
  setActiveSpecies: (species: string) => void
  setActiveDate: (date: string) => void
  setActiveLocality: (locality: string) => void
  setPlaceMode: (on: boolean) => void
  togglePlaceMode: () => void
  setMeasureMode: (on: boolean) => void
  toggleMeasureMode: () => void
  addToRecentSpecies: (species: string) => void
  setLastInsertedRecordNumber: (n: number | null) => void
}

export const usePlantStore = create<PlantState>((set) => ({
  activeSpecies: 'Picea abies',
  activeDate: new Date().toISOString().split('T')[0],
  activeLocality: '',
  placeMode: false,
  measureMode: false,
  recentSpecies: ['Picea abies', 'Pinus sylvestris', 'Quercus robur', 'Betula pendula', 'Fagus sylvatica'],
  lastInsertedRecordNumber: null,

  setActiveSpecies: (species) => set((state) => {
    const updated = [species, ...state.recentSpecies.filter(s => s !== species)].slice(0, 10)
    return { activeSpecies: species, recentSpecies: updated }
  }),
  setActiveDate: (date) => set({ activeDate: date }),
  setActiveLocality: (locality) => set({ activeLocality: locality }),
  setPlaceMode: (on) => set((state) => ({
    placeMode: on,
    // Mutual exclusion: activating place mode deactivates measure mode
    measureMode: on ? false : state.measureMode,
  })),
  togglePlaceMode: () => set((state) => ({
    placeMode: !state.placeMode,
    // Mutual exclusion: activating place mode deactivates measure mode
    measureMode: !state.placeMode ? false : state.measureMode,
  })),
  setMeasureMode: (on) => set((state) => ({
    measureMode: on,
    // Mutual exclusion: activating measure mode deactivates place mode
    placeMode: on ? false : state.placeMode,
  })),
  toggleMeasureMode: () => set((state) => ({
    measureMode: !state.measureMode,
    // Mutual exclusion: activating measure mode deactivates place mode
    placeMode: !state.measureMode ? false : state.placeMode,
  })),
  addToRecentSpecies: (species) => set((state) => {
    const updated = [species, ...state.recentSpecies.filter(s => s !== species)].slice(0, 10)
    return { recentSpecies: updated }
  }),
  setLastInsertedRecordNumber: (n) => set({ lastInsertedRecordNumber: n }),
}))
