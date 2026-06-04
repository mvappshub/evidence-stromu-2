'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { RowSelectionState, SortingState } from '@tanstack/react-table'
import { useRecordsTotalCount } from '@/hooks/use-records-total-count'
import { createRecordsTableColumns } from '@/components/table/records-table-columns'
import { useRecordEditDraft, type RecordsTableMeta } from '@/components/table/use-record-edit-draft'
import { useUiStore } from '@/store/useUiStore'
import {
  hasActiveRecordFilters,
  recordFiltersToQueryString,
} from '@/lib/record-filters-client'
import {
  getRecordsTablePresetToggle,
  isRecordsTablePresetActive,
} from '@/lib/records-table-presets'
import type { RecordsResponse } from '@/lib/types'

export function useRecordsTableController() {
  const searchQuery = useUiStore((s) => s.searchQuery)
  const setSearchQuery = useUiStore((s) => s.setSearchQuery)
  const filterSpecies = useUiStore((s) => s.filterSpecies)
  const setFilterSpecies = useUiStore((s) => s.setFilterSpecies)
  const filterLocality = useUiStore((s) => s.filterLocality)
  const setFilterLocality = useUiStore((s) => s.setFilterLocality)
  const selectedRecordNumber = useUiStore((s) => s.selectedRecordNumber)
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const dateFrom = useUiStore((s) => s.dateFrom)
  const dateTo = useUiStore((s) => s.dateTo)
  const setDateFrom = useUiStore((s) => s.setDateFrom)
  const setDateTo = useUiStore((s) => s.setDateTo)
  const clearDateRange = useUiStore((s) => s.clearDateRange)
  const hasNoteFilter = useUiStore((s) => s.hasNoteFilter)
  const setHasNoteFilter = useUiStore((s) => s.setHasNoteFilter)
  const noReminderFilter = useUiStore((s) => s.noReminderFilter)
  const setNoReminderFilter = useUiStore((s) => s.setNoReminderFilter)

  const [sorting, setSorting] = useState<SortingState>([{ id: 'recordNumber', desc: true }])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState({ page: 0, pageSize: 50 })
  const [importOpen, setImportOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const tableScrollRef = useRef<HTMLDivElement>(null)

  const resetPage = useCallback(() => {
    setPagination((p) => ({ ...p, page: 0 }))
  }, [])

  const uiFilters = useMemo(
    () => ({
      searchQuery,
      filterSpecies,
      filterLocality,
      dateFrom,
      dateTo,
      hasNoteFilter,
      noReminderFilter,
    }),
    [
      searchQuery,
      filterSpecies,
      filterLocality,
      dateFrom,
      dateTo,
      hasNoteFilter,
      noReminderFilter,
    ]
  )

  const queryParams = useMemo(() => {
    const sortField = sorting[0]?.id ?? 'recordNumber'
    const order = sorting[0]?.desc ? 'desc' : 'asc'
    return recordFiltersToQueryString(uiFilters, {
      sort: sortField,
      order,
      limit: String(pagination.pageSize),
      offset: String(pagination.page * pagination.pageSize),
    })
  }, [uiFilters, sorting, pagination])

  const recordsQuery = useQuery<RecordsResponse>({
    queryKey: ['records', queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/records?${queryParams}`)
      if (!res.ok) throw new Error('Failed to fetch records')
      return res.json()
    },
    placeholderData: (prev) => prev,
  })

  const filterQueryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    return params.toString()
  }, [dateFrom, dateTo])

  const filtersQuery = useQuery<{ species: string[]; localities: string[] }>({
    queryKey: ['records-filters', filterQueryParams],
    queryFn: async () => {
      const res = await fetch(`/api/records/filters?${filterQueryParams}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    staleTime: 60_000,
  })

  useEffect(() => {
    const el = tableScrollRef.current
    if (!el) return
    const onScroll = () => setIsScrolled(el.scrollTop > 8)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const { data: totalCount } = useRecordsTotalCount()
  const data = recordsQuery.data
  const filtersActive = hasActiveRecordFilters(uiFilters)
  const filteredCount = data?.count ?? 0
  const pageFrom = filteredCount > 0 ? pagination.page * pagination.pageSize + 1 : 0
  const pageTo =
    filteredCount > 0
      ? Math.min((pagination.page + 1) * pagination.pageSize, filteredCount)
      : 0

  const speciesFrequencyMap = useMemo(() => {
    if (!data?.records) return {}
    const freq: Record<string, number> = {}
    data.records.forEach((r) => {
      freq[r.speciesLatin] = (freq[r.speciesLatin] ?? 0) + 1
    })
    return freq
  }, [data])

  const maxSpeciesFreq = Math.max(1, ...Object.values(speciesFrequencyMap))
  const editingRecordOnPage = useMemo(() => {
    if (!selectedRecordNumber || !data?.records) return null
    return data.records.find((r) => r.recordNumber === selectedRecordNumber) ?? null
  }, [selectedRecordNumber, data])

  const { draft, patchField, save, isSaving, remove } = useRecordEditDraft(editingRecordOnPage)
  const tableMeta: RecordsTableMeta = useMemo(
    () => ({
      editingRecordNumber: selectedRecordNumber,
      isEditing: (rn) => rn === selectedRecordNumber,
      draft,
      patchField,
      save,
      isSaving,
      remove,
    }),
    [selectedRecordNumber, draft, patchField, save, isSaving, remove],
  )

  const selectedRecordNumbers = useMemo(() => {
    if (!data?.records) return []
    return data.records.filter((_, idx) => rowSelection[idx]).map((r) => r.recordNumber)
  }, [data, rowSelection])

  const columns = useMemo(
    () => createRecordsTableColumns({ speciesFrequencyMap, maxSpeciesFreq }),
    [speciesFrequencyMap, maxSpeciesFreq],
  )

  const totalPages = Math.ceil((data?.count ?? 0) / pagination.pageSize)
  const presetState = { dateFrom, dateTo, hasNoteFilter, noReminderFilter }
  const isPresetActive = (preset: string) => isRecordsTablePresetActive(preset, presetState)

  const togglePreset = (preset: string) => {
    const result = getRecordsTablePresetToggle(preset, presetState)
    if (!result) return

    switch (result.action) {
      case 'clearDateRange':
        clearDateRange()
        break
      case 'setDateRange':
        setDateFrom(result.dateFrom)
        setDateTo(result.dateTo)
        break
      case 'setHasNoteFilter':
        setHasNoteFilter(result.value)
        break
      case 'setNoReminderFilter':
        setNoReminderFilter(result.value)
        break
    }
    resetPage()
  }

  return {
    searchQuery,
    setSearchQuery,
    filterSpecies,
    setFilterSpecies,
    filterLocality,
    setFilterLocality,
    selectedRecordNumber,
    setSelectedRecordNumber,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    clearDateRange,
    hasNoteFilter,
    noReminderFilter,
    sorting,
    setSorting,
    rowSelection,
    setRowSelection,
    pagination,
    setPagination,
    importOpen,
    setImportOpen,
    isScrolled,
    tableScrollRef,
    resetPage,
    data,
    isLoading: recordsQuery.isLoading,
    isError: recordsQuery.isError,
    speciesOptions: filtersQuery.data?.species ?? [],
    localityOptions: filtersQuery.data?.localities ?? [],
    totalCount,
    filtersActive,
    filteredCount,
    pageFrom,
    pageTo,
    selectedRecordNumbers,
    columns,
    tableMeta,
    totalPages,
    isPresetActive,
    togglePreset,
  }
}
