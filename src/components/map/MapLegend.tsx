'use client'

import { useState } from 'react'
import { Info, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LayerMode } from './HeatmapToggle'

interface MapLegendProps {
  layerMode: LayerMode
}

export function MapLegend({ layerMode }: MapLegendProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute bottom-8 right-3 z-10 max-w-[160px]">
      <Button
        variant="secondary"
        size="icon"
        className={cn(
          'size-7 shadow-md border mb-1 ml-auto block',
          open
            ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800'
            : 'bg-background/90 backdrop-blur-sm border-border'
        )}
        onClick={() => setOpen(!open)}
        title="Legenda"
      >
        <Info className="size-3" />
      </Button>

      {open && (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-2.5 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-xs">Legenda</span>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="size-3" />
            </button>
          </div>

          {layerMode === 'points' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full bg-green-500 border-2 border-white shadow-sm shrink-0" />
                <span>Strom</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center size-5 rounded-full bg-green-400 border-2 border-white shadow-sm text-[8px] font-bold text-white shrink-0">
                  5
                </span>
                <span>Shluk (X stromů)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block size-3.5 rounded-full bg-green-500 border-[2.5px] border-yellow-500 shadow-sm shrink-0" />
                <span>Vybraný strom</span>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <span className="text-muted-foreground">Hustota stromů</span>
                <div className="h-2.5 rounded-full overflow-hidden"
                  style={{
                    background: 'linear-gradient(to right, rgba(34,197,94,0.2), rgba(34,197,94,0.4), rgba(132,204,22,0.6), rgba(234,179,8,0.8), rgba(239,68,68,0.9))',
                  }}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Málo</span>
                  <span>Hodně</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
