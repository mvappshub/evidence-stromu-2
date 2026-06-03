'use client'

import { useState } from 'react'
import { Map } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { MAP_STYLE_OPTIONS, type MapStyleKey } from '@/lib/map-basemaps'

export type { MapStyleKey } from '@/lib/map-basemaps'
export { getMapStyle } from '@/lib/map-basemaps'

interface MapStyleSwitcherProps {
  currentStyle: MapStyleKey
  onStyleChange: (style: MapStyleKey) => void
  className?: string
}

export function MapStyleSwitcher({ currentStyle, onStyleChange, className }: MapStyleSwitcherProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 rounded-none"
          title="Podklad mapy"
        >
          <Map className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className={cn('w-52 p-1 style-switcher-fade-in', className)}>
        {MAP_STYLE_OPTIONS.map((style) => (
          <button
            key={style.key}
            type="button"
            className={cn(
              'w-full text-left px-3 py-2 rounded-sm text-sm transition-colors',
              currentStyle === style.key
                ? 'bg-secondary text-secondary-foreground font-medium'
                : 'hover:bg-accent'
            )}
            onClick={() => {
              onStyleChange(style.key)
              setOpen(false)
            }}
          >
            <div className="font-medium text-xs">{style.label}</div>
            <div className="text-[10px] text-muted-foreground">{style.description}</div>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
