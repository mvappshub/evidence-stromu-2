import type { StyleSpecification } from 'maplibre-gl'
import {
  CUZK_ORTOFOTO_ATTRIBUTION,
  CUZK_ORTOFOTO_MAX_ZOOM,
  CUZK_ORTOFOTO_MIN_ZOOM,
  CUZK_ORTOFOTO_WMS_URL,
} from '@/lib/cuzk-ortofoto'

export type MapStyleKey = 'osm' | 'ortho' | 'topo' | 'dark'

export interface MapStyleOption {
  key: MapStyleKey
  label: string
  description: string
}

export const MAP_STYLE_OPTIONS: MapStyleOption[] = [
  { key: 'osm', label: 'Mapa', description: 'OpenStreetMap' },
  { key: 'ortho', label: 'Ortofoto ČR', description: 'ČÚZK — letecký snímek Česka' },
  { key: 'topo', label: 'Topografická', description: 'OpenTopoMap' },
  { key: 'dark', label: 'Tmavá', description: 'CartoDB Dark' },
]

/** Letecký podklad — vyšší kontrast vrstev stromů. */
export function isAerialBasemap(key: MapStyleKey): boolean {
  return key === 'ortho'
}

export function getMapStyle(key: MapStyleKey): StyleSpecification {
  switch (key) {
    case 'osm':
      return {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxzoom: 19,
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      }
    case 'ortho':
      return {
        version: 8,
        sources: {
          ortho: {
            type: 'raster',
            tiles: [CUZK_ORTOFOTO_WMS_URL],
            tileSize: 256,
            attribution: CUZK_ORTOFOTO_ATTRIBUTION,
            minzoom: CUZK_ORTOFOTO_MIN_ZOOM,
            maxzoom: CUZK_ORTOFOTO_MAX_ZOOM,
          },
        },
        layers: [{ id: 'ortho', type: 'raster', source: 'ortho' }],
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
