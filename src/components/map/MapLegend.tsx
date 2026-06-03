'use client'

import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { MAP_COLORS, MAP_COLORS_AERIAL } from '@/lib/map-colors'
import { isAerialBasemap, type MapStyleKey } from '@/lib/map-basemaps'
import type { LayerMode } from './HeatmapToggle'

interface MapLegendProps {
  layerMode: LayerMode
  mapStyle: MapStyleKey
}

export function MapLegend({ layerMode, mapStyle }: MapLegendProps) {
  const colors = isAerialBasemap(mapStyle) ? MAP_COLORS_AERIAL : MAP_COLORS
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
              <span className="size-2 rounded-full shrink-0" style={{ background: colors.point }} />
              bod
            </li>
            <li className="flex items-center gap-2">
              <span
                className="size-2 rounded-full ring-1 shrink-0"
                style={{ background: colors.point, outlineColor: colors.pointSelectedStroke, outlineWidth: 2 }}
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
                background: `linear-gradient(to right, transparent, ${colors.point}88, ${colors.point})`,
              }}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
