'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PAGE_SIZE_OPTIONS = [25, 50, 100]

type RecordsTablePaginationProps = {
  page: number
  pageSize: number
  totalPages: number
  pageFrom: number
  pageTo: number
  filteredCount: number
  filtersActive: boolean
  totalCount?: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function RecordsTablePagination({
  page,
  pageSize,
  totalPages,
  pageFrom,
  pageTo,
  filteredCount,
  filtersActive,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: RecordsTablePaginationProps) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 border-t bg-background/95">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Řádků:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(val) => onPageSizeChange(Number(val))}
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
        <span className="text-xs text-muted-foreground tabular-nums">
          {filteredCount > 0 ? (
            <>
              {pageFrom}–{pageTo} z {filteredCount}
              {filtersActive &&
                totalCount !== undefined &&
                totalCount !== filteredCount &&
                ` · ${totalCount} celkem`}
            </>
          ) : (
            'Žádné záznamy'
          )}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-7" disabled={page === 0} onClick={() => onPageChange(0)}>
          <ChevronsLeft className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={page === 0}
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <span className="text-xs tabular-nums px-1">
          {page + 1} / {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(Math.max(0, totalPages - 1))}
        >
          <ChevronsRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
