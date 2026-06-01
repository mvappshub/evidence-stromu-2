'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  TreePine,
  Loader2,
  MapPin,
  FileJson,
  FileSpreadsheet,
  Upload,
  CalendarDays,
  StickyNote,
  BellOff,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { czechPlural } from '@/lib/czech-plural'
import { CoordCell } from '@/components/table/CoordCell'
import { ReminderCell } from '@/components/table/ReminderCell'
import { BulkActionBar } from '@/components/table/BulkActionBar'
import { RecordEditor } from '@/components/editors/RecordEditor'
import { DateRangePicker } from '@/components/table/DateRangePicker'
import { ImportDialog } from '@/components/ImportDialog'
import { PrintView } from '@/components/PrintView'
import { useUiStore } from '@/store/useUiStore'
import type { TreeRecord, RecordsResponse } from '@/lib/types'

const PAGE_SIZE_OPTIONS = [25, 50, 100]

export function RecordsTable() {
  // UI store
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
  const speciesFilter = useUiStore((s) => s.speciesFilter)
  const setSpeciesFilter = useUiStore((s) => s.setSpeciesFilter)
  const hasNoteFilter = useUiStore((s) => s.hasNoteFilter)
  const setHasNoteFilter = useUiStore((s) => s.setHasNoteFilter)
  const noReminderFilter = useUiStore((s) => s.noReminderFilter)
  const setNoReminderFilter = useUiStore((s) => s.setNoReminderFilter)

  // Local table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'recordNumber', desc: true },
  ])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState({ page: 0, pageSize: 50 })
  const [editorOpen, setEditorOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const [prevCount, setPrevCount] = useState<number | null>(null)
  const [countAnimating, setCountAnimating] = useState(false)

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (filterSpecies) params.set('species', filterSpecies)
    if (filterLocality) params.set('locality', filterLocality)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (hasNoteFilter) params.set('hasNote', 'true')
    if (noReminderFilter) params.set('noReminder', 'true')

    const sortField = sorting[0]?.id ?? 'recordNumber'
    const order = sorting[0]?.desc ? 'desc' : 'asc'
    params.set('sort', sortField)
    params.set('order', order)
    params.set('limit', String(pagination.pageSize))
    params.set('offset', String(pagination.page * pagination.pageSize))

    return params.toString()
  }, [searchQuery, filterSpecies, filterLocality, dateFrom, dateTo, hasNoteFilter, noReminderFilter, sorting, pagination])

  // Fetch records
  const { data, isLoading, isError } = useQuery<RecordsResponse>({
    queryKey: ['records', queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/records?${queryParams}`)
      if (!res.ok) throw new Error('Failed to fetch records')
      return res.json()
    },
    placeholderData: (prev) => prev,
  })

  // Fetch unique species and locality values for filter dropdowns
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

  // Track scroll position for shadow indicator
  useEffect(() => {
    const el = tableScrollRef.current
    if (!el) return
    const onScroll = () => setIsScrolled(el.scrollTop > 8)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Animated counter when filtered count changes
  useEffect(() => {
    if (data?.count !== undefined && prevCount !== null && data.count !== prevCount) {
      setCountAnimating(true)
      const timer = setTimeout(() => setCountAnimating(false), 400)
      return () => clearTimeout(timer)
    }
    if (data?.count !== undefined) {
      setPrevCount(data.count)
    }
  }, [data?.count])

  // Species frequency map for dot indicator
  const speciesFrequencyMap = useMemo(() => {
    if (!data?.records) return {}
    const freq: Record<string, number> = {}
    data.records.forEach((r) => {
      freq[r.speciesLatin] = (freq[r.speciesLatin] ?? 0) + 1
    })
    return freq
  }, [data])
  const maxSpeciesFreq = Math.max(1, ...Object.values(speciesFrequencyMap))

  // Selected record for editor
  const editingRecord = useMemo(() => {
    if (!selectedRecordNumber || !data?.records) return null
    return data.records.find((r) => r.recordNumber === selectedRecordNumber) ?? null
  }, [selectedRecordNumber, data])

  // Selected row numbers for bulk actions
  const selectedRecordNumbers = useMemo(() => {
    if (!data?.records) return []
    return data.records
      .filter((_, idx) => rowSelection[idx])
      .map((r) => r.recordNumber)
  }, [data, rowSelection])

  // Column definitions
  const columns = useMemo<ColumnDef<TreeRecord>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Vybrat vše"
            className="checkbox-green"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Vybrat záznam ${row.original.recordNumber}`}
            className="checkbox-green"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        accessorKey: 'recordNumber',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Záznam
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            #{row.original.recordNumber}
          </span>
        ),
        size: 70,
      },
      {
        accessorKey: 'plantedAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Datum
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = new Date(row.original.plantedAt)
          return (
            <span className="text-xs whitespace-nowrap">
              {format(date, 'd.M.yyyy', { locale: cs })}
            </span>
          )
        },
        size: 100,
      },
      {
        accessorKey: 'speciesLatin',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Druh
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const freq = speciesFrequencyMap[row.original.speciesLatin] ?? 0
          const intensity = maxSpeciesFreq > 0 ? freq / maxSpeciesFreq : 0
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm italic inline-flex items-center cursor-default">
                  {row.original.speciesLatin}
                  <span
                    className="species-freq-dot"
                    style={{
                      backgroundColor: `oklch(${0.4 + intensity * 0.3} ${0.1 + intensity * 0.12} 145 / ${0.3 + intensity * 0.7})`,
                    }}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <em>{row.original.speciesLatin}</em> — {freq} {czechPlural(freq, ['záznam', 'záznamy', 'záznamů'])} tohoto druhu
              </TooltipContent>
            </Tooltip>
          )
        },
      },
      {
        accessorKey: 'locality',
        header: 'Lokalita',
        cell: ({ row }) => {
          const locality = row.original.locality
          if (!locality) return <span className="text-muted-foreground text-xs">—</span>
          if (locality.length > 20) {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs cursor-default truncate max-w-[120px] inline-block align-bottom">{locality.slice(0, 20)}…</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">{locality}</p>
                </TooltipContent>
              </Tooltip>
            )
          }
          return <span className="text-xs">{locality}</span>
        },
        size: 120,
      },
      {
        id: 'coords',
        header: 'Souřadnice',
        cell: ({ row }) => <CoordCell recordNumber={row.original.recordNumber} lat={row.original.lat} lng={row.original.lng} />,
        enableSorting: false,
        size: 80,
      },
      {
        accessorKey: 'note',
        header: 'Poznámka',
        cell: ({ row }) => {
          const note = row.original.note
          if (!note) return <span className="text-muted-foreground text-xs">—</span>
          if (note.length > 30) {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs cursor-default truncate max-w-[180px] inline-block align-bottom">
                    {note.slice(0, 30)}…
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">{note}</p>
                </TooltipContent>
              </Tooltip>
            )
          }
          return <span className="text-xs">{note}</span>
        },
        enableSorting: false,
        size: 200,
      },
      {
        id: 'reminders',
        header: 'Připomínky',
        cell: ({ row }) => <ReminderCell record={row.original} />,
        enableSorting: false,
        size: 100,
      },
    ],
    []
  )

  const table = useReactTable({
    data: data?.records ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
    enableMultiRowSelection: true,
    manualPagination: true,
    pageCount: Math.ceil((data?.count ?? 0) / pagination.pageSize),
  })

  const totalPages = Math.ceil((data?.count ?? 0) / pagination.pageSize)

  // Quick filter preset helpers
  const today = new Date()
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const thisYearStart = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
  const last30DaysStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
      if (isActive) { clearDateRange() } else { setDateFrom(thisMonthStart); setDateTo(todayStr) }
    }
    if (preset === 'thisYear') {
      if (isActive) { clearDateRange() } else { setDateFrom(thisYearStart); setDateTo(todayStr) }
    }
    if (preset === 'last30') {
      if (isActive) { clearDateRange() } else { setDateFrom(last30DaysStart); setDateTo(todayStr) }
    }
    if (preset === 'noReminder') { setNoReminderFilter(!isActive) }
    if (preset === 'hasNote') { setHasNoteFilter(!isActive) }
    setPagination((p) => ({ ...p, page: 0 }))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Quick filter presets */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2 pb-1">
        <button
          onClick={() => togglePreset('thisMonth')}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border',
            isPresetActive('thisMonth')
              ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700'
              : 'bg-background text-muted-foreground border-border hover:bg-green-50 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-950/30 dark:hover:text-green-400'
          )}
        >
          <CalendarDays className="size-3" />
          Tento měsíc
          {isPresetActive('thisMonth') && <X className="size-2.5 ml-0.5" />}
        </button>
        <button
          onClick={() => togglePreset('thisYear')}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border',
            isPresetActive('thisYear')
              ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700'
              : 'bg-background text-muted-foreground border-border hover:bg-green-50 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-950/30 dark:hover:text-green-400'
          )}
        >
          <CalendarDays className="size-3" />
          Tento rok
          {isPresetActive('thisYear') && <X className="size-2.5 ml-0.5" />}
        </button>
        <button
          onClick={() => togglePreset('last30')}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border',
            isPresetActive('last30')
              ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700'
              : 'bg-background text-muted-foreground border-border hover:bg-green-50 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-950/30 dark:hover:text-green-400'
          )}
        >
          <CalendarDays className="size-3" />
          Poslední 30 dní
          {isPresetActive('last30') && <X className="size-2.5 ml-0.5" />}
        </button>
        <button
          onClick={() => togglePreset('noReminder')}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border',
            isPresetActive('noReminder')
              ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700'
              : 'bg-background text-muted-foreground border-border hover:bg-green-50 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-950/30 dark:hover:text-green-400'
          )}
        >
          <BellOff className="size-3" />
          Bez připomínky
          {isPresetActive('noReminder') && <X className="size-2.5 ml-0.5" />}
        </button>
        <button
          onClick={() => togglePreset('hasNote')}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border',
            isPresetActive('hasNote')
              ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700'
              : 'bg-background text-muted-foreground border-border hover:bg-green-50 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-950/30 dark:hover:text-green-400'
          )}
        >
          <StickyNote className="size-3" />
          S poznámkou
          {isPresetActive('hasNote') && <X className="size-2.5 ml-0.5" />}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 filter-bar">
        <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Hledat druh, lokalitu, poznámku…"
            className="h-8 text-sm pl-8"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPagination((p) => ({ ...p, page: 0 }))
            }}
          />
        </div>

        <Select
          value={filterSpecies || '__all__'}
          onValueChange={(val) => {
            setFilterSpecies(val === '__all__' ? '' : val)
            setPagination((p) => ({ ...p, page: 0 }))
          }}
        >
          <SelectTrigger className="h-8 text-sm w-full sm:w-[160px]">
            <SelectValue placeholder="Druh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Všechny druhy</SelectItem>
            {speciesOptions.map((sp) => (
              <SelectItem key={sp} value={sp}>
                {sp}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterLocality || '__all__'}
          onValueChange={(val) => {
            setFilterLocality(val === '__all__' ? '' : val)
            setPagination((p) => ({ ...p, page: 0 }))
          }}
        >
          <SelectTrigger className="h-8 text-sm w-full sm:w-[160px]">
            <SelectValue placeholder="Lokalita" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Všechny lokality</SelectItem>
            {localityOptions.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(d) => {
            setDateFrom(d)
            setPagination((p) => ({ ...p, page: 0 }))
          }}
          onDateToChange={(d) => {
            setDateTo(d)
            setPagination((p) => ({ ...p, page: 0 }))
          }}
          onClear={() => {
            clearDateRange()
            setPagination((p) => ({ ...p, page: 0 }))
          }}
        />

        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap flex items-center gap-1">
          <TreePine className="size-3 text-green-600" />
          <span className={cn('tabular-nums', countAnimating && 'counter-animate')}>
            {data?.count !== undefined ? data.count : '…'}
          </span>
          /<span className="tabular-nums text-muted-foreground/60">{data?.count !== undefined ? czechPlural(data.count, ['záznam', 'záznamy', 'záznamů']) : '…'}</span>
        </span>

        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Importovat</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => {
                  const params = new URLSearchParams()
                  if (searchQuery) params.set('search', searchQuery)
                  if (filterSpecies) params.set('species', filterSpecies)
                  if (filterLocality) params.set('locality', filterLocality)
                  if (dateFrom) params.set('dateFrom', dateFrom)
                  if (dateTo) params.set('dateTo', dateTo)
                  window.open(`/api/records/export?format=csv&${params.toString()}`, '_blank')
                }}
              >
                <FileSpreadsheet className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Exportovat CSV</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => {
                  const params = new URLSearchParams()
                  if (searchQuery) params.set('search', searchQuery)
                  if (filterSpecies) params.set('species', filterSpecies)
                  if (filterLocality) params.set('locality', filterLocality)
                  if (dateFrom) params.set('dateFrom', dateFrom)
                  if (dateTo) params.set('dateTo', dateTo)
                  window.open(`/api/records/export?format=geojson&${params.toString()}`, '_blank')
                }}
              >
                <FileJson className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Exportovat GeoJSON</TooltipContent>
          </Tooltip>
          <PrintView
            searchQuery={searchQuery}
            filterSpecies={filterSpecies}
            filterLocality={filterLocality}
            dateFrom={dateFrom}
            dateTo={dateTo}
            recordCount={data?.count ?? 0}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto relative" ref={tableScrollRef}>
        {isScrolled && <div className="scroll-shadow-top" />}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm table-header-enhanced">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    className="text-xs font-semibold"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="table-stripe">
            {isLoading ? (
              // Loading skeleton with green shimmer
              Array.from({ length: 8 }).map((_, idx) => (
                <TableRow key={idx}>
                  {Array.from({ length: columns.length }).map((_, cellIdx) => (
                    <TableCell key={cellIdx}>
                      <div className="h-4 w-full rounded skeleton-green" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Chyba při načítání dat. Zkuste to prosím znovu.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40">
                  <div className="flex flex-col items-center gap-4 py-8 text-muted-foreground bg-gradient-to-b from-green-50/50 to-transparent dark:from-green-950/10 dark:to-transparent">
                    <div className="size-24 relative flex items-center justify-center">
                      <div className="css-tree-silhouette w-10 h-14" />
                      <div className="absolute inset-0 rounded-full bg-green-100/50 dark:bg-green-950/20" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Žádné záznamy k zobrazení</p>
                      <p className="text-xs mt-1">Přidejte nový záznam kliknutím na mapu v režimu vkládání, nebo zmáčkněte <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">P</kbd></p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, idx) => {
                const isSelected =
                  row.original.recordNumber === selectedRecordNumber
                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn(
                      'cursor-pointer table-row-smooth row-animate hover:bg-green-50/50 dark:hover:bg-green-950/10 hover:border-l-[3px] hover:border-l-green-400 dark:hover:border-l-green-600',
                      isSelected && 'bg-green-50/60 dark:bg-green-950/20 border-l-[3px] border-l-green-500'
                    )}
                    style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}
                    onClick={() => {
                      setSelectedRecordNumber(row.original.recordNumber)
                      setEditorOpen(true)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="text-xs">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-2 p-2 border-t bg-background/95">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Řádků:</span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(val) =>
              setPagination({ page: 0, pageSize: Number(val) })
            }
          >
            <SelectTrigger className="h-7 text-xs w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data?.count !== undefined && data.count > 0 && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              Zobrazeno {pagination.page * pagination.pageSize + 1}–{Math.min((pagination.page + 1) * pagination.pageSize, data.count)} z {data.count}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-7 pagination-green-ring hover:border-green-300 dark:hover:border-green-700 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            disabled={pagination.page === 0}
            onClick={() => setPagination((p) => ({ ...p, page: 0 }))}
          >
            <ChevronsLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7 pagination-green-ring hover:border-green-300 dark:hover:border-green-700 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            disabled={pagination.page === 0}
            onClick={() =>
              setPagination((p) => ({ ...p, page: Math.max(0, p.page - 1) }))
            }
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="pagination-pill-active tabular-nums">
            {pagination.page + 1} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-7 pagination-green-ring hover:border-green-300 dark:hover:border-green-700 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            disabled={pagination.page >= totalPages - 1}
            onClick={() =>
              setPagination((p) => ({ ...p, page: p.page + 1 }))
            }
          >
            <ChevronRight className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7 pagination-green-ring hover:border-green-300 dark:hover:border-green-700 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            disabled={pagination.page >= totalPages - 1}
            onClick={() =>
              setPagination((p) => ({ ...p, page: totalPages - 1 }))
            }
          >
            <ChevronsRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      <BulkActionBar
        selectedRecordNumbers={selectedRecordNumbers}
        onClearSelection={() => setRowSelection({})}
        className="scale-in"
      />

      {/* Record editor dialog */}
      <RecordEditor
        record={editingRecord}
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) setSelectedRecordNumber(null)
        }}
      />

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  )
}
