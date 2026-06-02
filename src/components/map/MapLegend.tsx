'use client'

import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { MAP_COLORS } from '@/lib/map-colors'
import type { LayerMode } from './HeatmapToggle'

interface MapLegendProps {
  layerMode: LayerMode
}

export function MapLegend({ layerMode }: MapLegendProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 rounded-none border-l border-border"
          title="Legenda"
        >
          <Info className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-2 rounded-sm text-[11px]">
        <p className="font-mono text-muted-foreground mb-1.5">legenda</p>
        {layerMode === 'points' ? (
          <ul className="space-y-1 text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-2 rounded-full shrink-0" style={{ background: MAP_COLORS.point }} />
              bod
            </li>
            <li className="flex items-center gap-2">
              <span
                className="inline-flex size-3.5 items-center justify-center rounded-full text-[7px] font-mono text-[#1e1e1e] shrink-0"
                style={{ background: MAP_COLORS.cluster[1] }}
              >
                n
              </span>
              shluk
            </li>
            <li className="flex items-center gap-2">
              <span
                className="size-2 rounded-full ring-1 shrink-0"
                style={{ background: MAP_COLORS.point, outlineColor: MAP_COLORS.pointSelectedStroke, outlineWidth: 2 }}
              />
              vybraný
            </li>
          </ul>
        ) : (
          <div className="space-y-1 text-muted-foreground font-mono">
            <p>hustota</p>
            <div
              className="h-1.5 border border-border"
              style={{
                background: `linear-gradient(to right, transparent, ${MAP_COLORS.point}88, ${MAP_COLORS.point})`,
              }}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
