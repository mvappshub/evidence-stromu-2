'use client'

import { Flame, CircleDot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { LayerMode } from '@/lib/map-types'

export type { LayerMode } from '@/lib/map-types'

interface HeatmapToggleProps {
  mode: LayerMode
  onToggle: () => void
}

export function HeatmapToggle({ mode, onToggle }: HeatmapToggleProps) {
  const isHeatmap = mode === 'heatmap'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'size-6 rounded-none border-l border-border',
            isHeatmap && 'bg-accent text-foreground',
          )}
          onClick={onToggle}
          title={isHeatmap ? 'Teplotní mapa' : 'Bodová vrstva'}
        >
          {isHeatmap ? <Flame className="size-3" /> : <CircleDot className="size-3" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        {isHeatmap ? 'Teplotní mapa hustoty' : 'Bodová vrstva stromů'}
      </TooltipContent>
    </Tooltip>
  )
}
