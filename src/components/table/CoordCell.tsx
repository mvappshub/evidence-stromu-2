'use client'

import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/store/useUiStore'

interface CoordCellProps {
  recordNumber: number
}

export function CoordCell({ recordNumber }: CoordCellProps) {
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const setViewMode = useUiStore((s) => s.setViewMode)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedRecordNumber(recordNumber)
    setViewMode('both')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7"
      onClick={handleClick}
      title="Zobrazit na mapě"
    >
      <MapPin className="size-4 text-muted-foreground hover:text-primary transition-colors" />
    </Button>
  )
}
