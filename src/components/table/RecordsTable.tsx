'use client'

import { useState, useMemo } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { CoordCell } from '@/components/table/CoordCell'
import { ReminderCell } from '@/components/table/ReminderCell'
import { BulkActionBar } from '@/components/table/BulkActionBar'
import { RecordEditor } from '@/components/editors/RecordEditor'
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

  // Local table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'recordNumber', desc: true },
  ])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState({ page: 0, pageSize: 50 })
  const [editorOpen, setEditorOpen] = useState(false)

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (filterSpecies) params.set('species', filterSpecies)
    if (filterLocality) params.set('locality', filterLocality)

    const sortField = sorting[0]?.id ?? 'recordNumber'
    const order = sorting[0]?.desc ? 'desc' : 'asc'
    params.set('sort', sortField)
    params.set('order', order)
    params.set('limit', String(pagination.pageSize))
    params.set('offset', String(pagination.page * pagination.pageSize))

    return params.toString()
  }, [searchQuery, filterSpecies, filterLocality, sorting, pagination])

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
  const { data: filterData } = useQuery<RecordsResponse>({
    queryKey: ['records-filters'],
    queryFn: async () => {
      const res = await fetch('/api/records?limit=1000')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    staleTime: 60_000,
  })

  const speciesOptions = useMemo(() => {
    if (!filterData?.records) return []
    const set = new Set(filterData.records.map((r) => r.speciesLatin))
    return Array.from(set).sort()
  }, [filterData])

  const localityOptions = useMemo(() => {
    if (!filterData?.records) return []
    const set = new Set(
      filterData.records.map((r) => r.locality).filter(Boolean) as string[]
    )
    return Array.from(set).sort()
  }, [filterData])

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
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Vybrat záznam ${row.original.recordNumber}`}
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
            #
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.recordNumber}
          </span>
        ),
        size: 60,
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
        cell: ({ row }) => (
          <span className="text-sm italic">
            {row.original.speciesLatin}
          </span>
        ),
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
        cell: ({ row }) => <CoordCell recordNumber={row.original.recordNumber} />,
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

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <div className="relative flex-1 min-w-[180px]">
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
          <SelectTrigger className="h-8 text-sm w-[160px]">
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
          <SelectTrigger className="h-8 text-sm w-[160px]">
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

        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap flex items-center gap-1">
          <TreePine className="size-3 text-green-600" />
          {data?.count ?? '…'} záznamů
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    className="text-xs"
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
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 8 }).map((_, idx) => (
                <TableRow key={idx}>
                  {Array.from({ length: columns.length }).map((_, cellIdx) => (
                    <TableCell key={cellIdx}>
                      <Skeleton className="h-4 w-full" />
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
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                    <div className="size-16 rounded-full bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
                      <TreePine className="size-8 text-green-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Žádné záznamy k zobrazení</p>
                      <p className="text-xs mt-1">Přidejte nový záznam kliknutím na mapu v režimu vkládání</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isSelected =
                  row.original.recordNumber === selectedRecordNumber
                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-green-50/50 dark:hover:bg-green-950/10',
                      isSelected && 'bg-green-50 dark:bg-green-950/20'
                    )}
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
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            disabled={pagination.page === 0}
            onClick={() => setPagination((p) => ({ ...p, page: 0 }))}
          >
            <ChevronsLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            disabled={pagination.page === 0}
            onClick={() =>
              setPagination((p) => ({ ...p, page: Math.max(0, p.page - 1) }))
            }
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground px-2 min-w-[80px] text-center">
            {pagination.page + 1} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
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
            className="size-7"
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
    </div>
  )
}
