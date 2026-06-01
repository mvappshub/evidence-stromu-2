import { create } from 'zustand'
import type { ViewMode } from '@/lib/types'

interface UiState {
  viewMode: ViewMode
  selectedRecordNumber: number | null
  searchQuery: string
  filterSpecies: string
  filterLocality: string
  dateFrom: string | null
  dateTo: string | null
  setViewMode: (mode: ViewMode) => void
  setSelectedRecordNumber: (n: number | null) => void
  setSearchQuery: (q: string) => void
  setFilterSpecies: (s: string) => void
  setFilterLocality: (s: string) => void
  setDateFrom: (d: string | null) => void
  setDateTo: (d: string | null) => void
  clearDateRange: () => void
}

export const useUiStore = create<UiState>((set) => ({
  viewMode: 'both',
  selectedRecordNumber: null,
  searchQuery: '',
  filterSpecies: '',
  filterLocality: '',
  dateFrom: null,
  dateTo: null,
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedRecordNumber: (n) => set({ selectedRecordNumber: n }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterSpecies: (s) => set({ filterSpecies: s }),
  setFilterLocality: (s) => set({ filterLocality: s }),
  setDateFrom: (d) => set({ dateFrom: d }),
  setDateTo: (d) => set({ dateTo: d }),
  clearDateRange: () => set({ dateFrom: null, dateTo: null }),
}))
