'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { TreePine } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useRecordsTotalCount } from '@/hooks/use-records-total-count'
import {
  hasActiveRecordFilters,
  recordFiltersToQueryString,
} from '@/lib/record-filters-client'
import { BulkActionBar } from '@/components/table/BulkActionBar'
import { useRecordEditDraft, type RecordsTableMeta } from '@/components/table/use-record-edit-draft'
import { createRecordsTableColumns } from '@/components/table/records-table-columns'
import { RecordsTableToolbar } from '@/components/table/RecordsTableToolbar'
import { RecordsTablePagination } from '@/components/table/RecordsTablePagination'
import { ImportDialog } from '@/components/ImportDialog'
import { useUiStore } from '@/store/useUiStore'
import type { RecordsResponse } from '@/lib/types'

export function RecordsTable() {
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

  const { data, isLoading, isError } = useQuery<RecordsResponse>({
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

  const { data: filterData } = useQuery<{ species: string[]; localities: string[] }>({
    queryKey: ['records-filters', filterQueryParams],
    queryFn: async () => {
      const res = await fetch(`/api/records/filters?${filterQueryParams}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    staleTime: 60_000,
  })

  const speciesOptions = filterData?.species ?? []
  const localityOptions = filterData?.localities ?? []

  useEffect(() => {
    const el = tableScrollRef.current
    if (!el) return
    const onScroll = () => setIsScrolled(el.scrollTop > 8)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const { data: totalCount } = useRecordsTotalCount()

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

  const table = useReactTable({
    data: data?.records ?? [],
    columns,
    meta: tableMeta,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: { sorting, rowSelection },
    enableMultiRowSelection: true,
    manualPagination: true,
    pageCount: Math.ceil((data?.count ?? 0) / pagination.pageSize),
  })

  const totalPages = Math.ceil((data?.count ?? 0) / pagination.pageSize)

  const today = new Date()
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const thisYearStart = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
  const last30DaysStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  const isPresetActive = (preset: string) => {
    if (preset === 'thisMonth') return dateFrom === thisMonthStart && dateTo === todayStr
    if (preset === 'thisYear') return dateFrom === thisYearStart && dateTo === todayStr
    if (preset === 'last30') return dateFrom === last30DaysStart && dateTo === todayStr
    if (preset === 'noReminder') return noReminderFilter
    if (preset === 'hasNote') return hasNoteFilter
    return false
  }

  const togglePreset = (preset: string) => {
    const isActive = isPresetActive(preset)
    if (preset === 'thisMonth') {
      if (isActive) clearDateRange()
      else {
        setDateFrom(thisMonthStart)
        setDateTo(todayStr)
      }
    }
    if (preset === 'thisYear') {
      if (isActive) clearDateRange()
      else {
        setDateFrom(thisYearStart)
        setDateTo(todayStr)
      }
    }
    if (preset === 'last30') {
      if (isActive) clearDateRange()
      else {
        setDateFrom(last30DaysStart)
        setDateTo(todayStr)
      }
    }
    if (preset === 'noReminder') setNoReminderFilter(!isActive)
    if (preset === 'hasNote') setHasNoteFilter(!isActive)
    resetPage()
  }

  return (
    <div className="flex flex-col h-full">
      <RecordsTableToolbar
        searchQuery={searchQuery}
        onSearchChange={(v) => {
          setSearchQuery(v)
          resetPage()
        }}
        filterSpecies={filterSpecies}
        onFilterSpeciesChange={(v) => {
          setFilterSpecies(v)
          resetPage()
        }}
        filterLocality={filterLocality}
        onFilterLocalityChange={(v) => {
          setFilterLocality(v)
          resetPage()
        }}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={(d) => {
          setDateFrom(d)
          resetPage()
        }}
        onDateToChange={(d) => {
          setDateTo(d)
          resetPage()
        }}
        onClearDateRange={() => {
          clearDateRange()
          resetPage()
        }}
        speciesOptions={speciesOptions}
        localityOptions={localityOptions}
        isPresetActive={isPresetActive}
        togglePreset={togglePreset}
        onImportClick={() => setImportOpen(true)}
        hasNoteFilter={hasNoteFilter}
        noReminderFilter={noReminderFilter}
      />

      <div className="flex-1 overflow-auto relative" ref={tableScrollRef}>
        {isScrolled && <div className="scroll-shadow-top" />}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm table-header-enhanced"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    className="text-xs font-semibold"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="table-stripe">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <TableRow key={idx}>
                  {Array.from({ length: columns.length }).map((_, cellIdx) => (
                    <TableCell key={cellIdx}>
                      <div className="h-4 w-full rounded bg-muted animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Chyba při načítání dat. Zkuste to prosím znovu.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40">
                  <div className="flex flex-col items-center gap-4 py-8 text-muted-foreground">
                    <TreePine className="size-10 opacity-40" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Žádné záznamy k zobrazení</p>
                      <p className="text-xs mt-1">
                        Přidejte nový záznam kliknutím na mapu v režimu vkládání, nebo zmáčkněte{' '}
                        <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">P</kbd>
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isActive = row.original.recordNumber === selectedRecordNumber
                return (
                  <TableRow
                    key={row.id}
                    data-state={isActive ? 'selected' : undefined}
                    className={cn('cursor-pointer hover:bg-muted/30', isActive && 'bg-muted/40')}
                    onClick={() => {
                      setSelectedRecordNumber(isActive ? null : row.original.recordNumber)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-1 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <RecordsTablePagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalPages={totalPages}
        pageFrom={pageFrom}
        pageTo={pageTo}
        filteredCount={filteredCount}
        filtersActive={filtersActive}
        totalCount={totalCount}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        onPageSizeChange={(pageSize) => setPagination({ page: 0, pageSize })}
      />

      <BulkActionBar
        selectedRecordNumbers={selectedRecordNumbers}
        onClearSelection={() => setRowSelection({})}
        className="scale-in"
      />

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
