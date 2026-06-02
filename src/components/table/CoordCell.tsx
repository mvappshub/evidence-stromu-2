'use client'

import { MapPin, Copy, Check } from 'lucide-react'
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useUiStore } from '@/store/useUiStore'
import { wgs84ToSjtsk, formatDms, formatSjtsk } from '@/lib/coords'
import type { RecordsTableMeta } from '@/components/table/use-record-edit-draft'

interface CoordCellProps {
  recordNumber: number
  lat: number
  lng: number
  tableMeta?: RecordsTableMeta
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    },
    [text],
  )
  return (
    <Button variant="ghost" size="icon" className="size-5 shrink-0" onClick={handleCopy} type="button">
      {copied ? <Check className="size-3" /> : <Copy className="size-3 text-muted-foreground" />}
    </Button>
  )
}

export function CoordCell({ recordNumber, lat, lng, tableMeta }: CoordCellProps) {
  const [open, setOpen] = useState(false)
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const setViewMode = useUiStore((s) => s.setViewMode)
  const editing = tableMeta?.isEditing(recordNumber) ?? false
  const draft = tableMeta?.draft

  const handleMapClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedRecordNumber(recordNumber)
    setViewMode('both')
  }

  if (editing && draft) {
    const dLat = draft.lat
    const dLng = draft.lng
    const valid = !isNaN(dLat) && !isNaN(dLng)
    return (
      <div className="flex items-center gap-0.5 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={handleMapClick} type="button">
          <MapPin className="size-3" />
        </Button>
        <Input
          type="number"
          step="any"
          className="h-6 w-[52px] px-1 font-mono text-[10px]"
          value={dLat}
          onChange={(e) => tableMeta?.patchField('lat', parseFloat(e.target.value) || 0)}
        />
        <Input
          type="number"
          step="any"
          className="h-6 w-[52px] px-1 font-mono text-[10px]"
          value={dLng}
          onChange={(e) => tableMeta?.patchField('lng', parseFloat(e.target.value) || 0)}
        />
        {valid && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-1 text-[9px] font-mono" type="button">
                ⋯
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 text-[10px] font-mono" align="start" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-1 items-center">
                <span className="text-muted-foreground">DMS</span>
                <span className="truncate">{formatDms(dLat, dLng)}</span>
                <CopyButton text={formatDms(dLat, dLng)} />
              </div>
              <div className="flex gap-1 items-center mt-1">
                <span className="text-muted-foreground">JTSK</span>
                <span className="truncate">
                  {(() => {
                    const s = wgs84ToSjtsk(dLat, dLng)
                    return formatSjtsk(s.x, s.y)
                  })()}
                </span>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon" className="size-6" onClick={handleMapClick} type="button">
        <MapPin className="size-3 text-muted-foreground" />
      </Button>
      <span className="font-mono text-[10px] text-muted-foreground">{lat.toFixed(4)}</span>
    </div>
  )
}
