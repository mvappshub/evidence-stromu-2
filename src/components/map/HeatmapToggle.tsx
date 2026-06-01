'use client'

import { Flame, CircleDot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type LayerMode = 'points' | 'heatmap'

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
          variant="secondary"
          size="icon"
          className={cn(
            'size-8 shadow-md border transition-colors',
            isHeatmap
              ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800'
              : 'bg-background/90 backdrop-blur-sm border-border'
          )}
          onClick={onToggle}
          title={isHeatmap ? 'Teplotní mapa' : 'Bodová vrstva'}
        >
          {isHeatmap ? (
            <Flame className="size-3.5" />
          ) : (
            <CircleDot className="size-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        {isHeatmap ? 'Teplotní mapa hustoty' : 'Bodová vrstva stromů'}
      </TooltipContent>
    </Tooltip>
  )
}
