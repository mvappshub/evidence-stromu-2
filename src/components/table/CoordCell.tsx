'use client'

import { MapPin, Copy, Check } from 'lucide-react'
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useUiStore } from '@/store/useUiStore'
import { wgs84ToSjtsk, formatDms, formatSjtsk } from '@/lib/coords'

interface CoordCellProps {
  recordNumber: number
  lat: number
  lng: number
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [text])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-5 shrink-0"
      onClick={handleCopy}
      title="Kopírovat"
    >
      {copied ? (
        <Check className="size-3 text-green-600" />
      ) : (
        <Copy className="size-3 text-muted-foreground" />
      )}
    </Button>
  )
}

export function CoordCell({ recordNumber, lat, lng }: CoordCellProps) {
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const setViewMode = useUiStore((s) => s.setViewMode)

  const handleMapClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedRecordNumber(recordNumber)
    setViewMode('both')
  }

  // Pre-compute coordinate formats
  const decimal = `${lat.toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${lng.toFixed(4)}°${lng >= 0 ? 'E' : 'W'}`
  const dms = formatDms(lat, lng)
  const sjtsk = wgs84ToSjtsk(lat, lng)
  const sjtskStr = formatSjtsk(sjtsk.x, sjtsk.y)

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={handleMapClick}
        title="Zobrazit na mapě"
      >
        <MapPin className="size-4 text-muted-foreground hover:text-primary transition-colors" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {lat.toFixed(4)}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 p-0"
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <MapPin className="size-3 text-green-600" />
              Souřadnice
            </h4>
          </div>
          <div className="divide-y">
            {/* WGS84 Decimal */}
            <div className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">Desetinné (WGS84)</p>
                  <p className="text-xs font-mono">{decimal}</p>
                </div>
                <CopyButton text={decimal} />
              </div>
            </div>
            {/* WGS84 DMS */}
            <div className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">Stupně (WGS84)</p>
                  <p className="text-xs font-mono">{dms}</p>
                </div>
                <CopyButton text={dms} />
              </div>
            </div>
            {/* S-JTSK */}
            <div className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">S-JTSK (Křovák)</p>
                  <p className="text-xs font-mono">{sjtskStr}</p>
                </div>
                <CopyButton text={sjtskStr} />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
