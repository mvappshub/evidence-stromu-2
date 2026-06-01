import { create } from 'zustand'

interface PlantState {
  // Active planting context (sticky defaults)
  activeSpecies: string
  activeDate: string // ISO date string, default today
  activeLocality: string

  // Place mode toggle
  placeMode: boolean

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
  addToRecentSpecies: (species: string) => void
  setLastInsertedRecordNumber: (n: number | null) => void
}

export const usePlantStore = create<PlantState>((set) => ({
  activeSpecies: 'Picea abies',
  activeDate: new Date().toISOString().split('T')[0],
  activeLocality: '',
  placeMode: false,
  recentSpecies: ['Picea abies', 'Pinus sylvestris', 'Quercus robur', 'Betula pendula', 'Fagus sylvatica'],
  lastInsertedRecordNumber: null,

  setActiveSpecies: (species) => set((state) => {
    const updated = [species, ...state.recentSpecies.filter(s => s !== species)].slice(0, 10)
    return { activeSpecies: species, recentSpecies: updated }
  }),
  setActiveDate: (date) => set({ activeDate: date }),
  setActiveLocality: (locality) => set({ activeLocality: locality }),
  setPlaceMode: (on) => set({ placeMode: on }),
  togglePlaceMode: () => set((state) => ({ placeMode: !state.placeMode })),
  addToRecentSpecies: (species) => set((state) => {
    const updated = [species, ...state.recentSpecies.filter(s => s !== species)].slice(0, 10)
    return { recentSpecies: updated }
  }),
  setLastInsertedRecordNumber: (n) => set({ lastInsertedRecordNumber: n }),
}))
