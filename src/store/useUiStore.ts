import { create } from 'zustand'
import type { ViewMode } from '@/lib/types'

interface UiState {
  viewMode: ViewMode
  selectedRecordNumber: number | null
  searchQuery: string
  filterSpecies: string
  filterLocality: string
  setViewMode: (mode: ViewMode) => void
  setSelectedRecordNumber: (n: number | null) => void
  setSearchQuery: (q: string) => void
  setFilterSpecies: (s: string) => void
  setFilterLocality: (s: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  viewMode: 'both',
  selectedRecordNumber: null,
  searchQuery: '',
  filterSpecies: '',
  filterLocality: '',
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedRecordNumber: (n) => set({ selectedRecordNumber: n }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterSpecies: (s) => set({ filterSpecies: s }),
  setFilterLocality: (s) => set({ filterLocality: s }),
}))
