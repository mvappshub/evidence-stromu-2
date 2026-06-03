'use client'

import { Loader2, X } from 'lucide-react'
import type { ParcelIdentifyResult } from '@/lib/wms-feature-info'

interface MapIdentifyCardProps {
  parcelInfo: ParcelIdentifyResult | null
  loading: boolean
  onClose: () => void
}

export function MapIdentifyCard({ parcelInfo, loading, onClose }: MapIdentifyCardProps) {
  if (!loading && !parcelInfo) return null

  return (
    <div className="absolute top-[4.5rem] left-1 z-10 bg-toolbar border border-border p-2 min-w-[180px] max-w-[260px] text-xs shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-medium text-muted-foreground">Parcela</span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          title="Zavřít"
        >
          <X className="size-3" />
        </button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-1">
          <Loader2 className="size-3 animate-spin" />
          Načítám…
        </div>
      ) : parcelInfo ? (
        <div className="space-y-1 font-mono tabular-nums">
          {parcelInfo.parcelNumber && (
            <div>
              <span className="text-muted-foreground">č. parcely: </span>
              {parcelInfo.parcelNumber}
            </div>
          )}
          {parcelInfo.cadastralArea && (
            <div>
              <span className="text-muted-foreground">k.ú.: </span>
              {parcelInfo.cadastralArea}
            </div>
          )}
          {!parcelInfo.parcelNumber && !parcelInfo.cadastralArea && parcelInfo.rawLabel && (
            <p className="text-[11px] leading-snug break-words">{parcelInfo.rawLabel}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
