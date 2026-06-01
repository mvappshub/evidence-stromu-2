'use client'

import { useState } from 'react'
import { Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type MapStyleKey = 'osm' | 'topo' | 'dark'

interface MapStyleOption {
  key: MapStyleKey
  label: string
  description: string
}

const MAP_STYLES: MapStyleOption[] = [
  { key: 'osm', label: 'Standardní', description: 'OpenStreetMap' },
  { key: 'topo', label: 'Topografická', description: 'OpenTopoMap' },
  { key: 'dark', label: 'Tmavá', description: 'CartoDB Dark' },
]

export function getMapStyle(key: MapStyleKey) {
  switch (key) {
    case 'osm':
      return {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxzoom: 19,
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      }
    case 'topo':
      return {
        version: 8,
        sources: {
          topo: {
            type: 'raster',
            tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
            maxzoom: 17,
          },
        },
        layers: [{ id: 'topo', type: 'raster', source: 'topo' }],
      }
    case 'dark':
      return {
        version: 8,
        sources: {
          dark: {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
            tileSize: 256,
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
            maxzoom: 19,
          },
        },
        layers: [{ id: 'dark', type: 'raster', source: 'dark' }],
      }
  }
}

interface MapStyleSwitcherProps {
  currentStyle: MapStyleKey
  onStyleChange: (style: MapStyleKey) => void
}

export function MapStyleSwitcher({ currentStyle, onStyleChange }: MapStyleSwitcherProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="size-8 shadow-md bg-background/90 backdrop-blur-sm border"
          title="Styl mapy"
        >
          <Layers className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        {MAP_STYLES.map((style) => (
          <button
            key={style.key}
            className={cn(
              'w-full text-left px-3 py-2 rounded-sm text-sm transition-colors',
              currentStyle === style.key
                ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 font-medium'
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
