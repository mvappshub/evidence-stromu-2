'use client'

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table'
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
import { BulkActionBar } from '@/components/table/BulkActionBar'
import { RecordsTableToolbar } from '@/components/table/RecordsTableToolbar'
import { RecordsTablePagination } from '@/components/table/RecordsTablePagination'
import { ImportDialog } from '@/components/ImportDialog'
import { useRecordsTableController } from '@/hooks/useRecordsTableController'

export function RecordsTable() {
  const controller = useRecordsTableController()
  const {
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
    isLoading,
    isError,
    speciesOptions,
    localityOptions,
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
  } = controller

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
