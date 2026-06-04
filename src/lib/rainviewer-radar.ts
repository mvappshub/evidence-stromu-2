import {
  RAINVIEWER_TILE_COLOR,
  RAINVIEWER_TILE_OPTIONS,
  RAINVIEWER_TILE_SIZE,
} from '@/lib/rainviewer-radar-config'

export interface RainviewerRadarFrame {
  time: number
  path: string
}

export interface RainviewerManifest {
  version: string
  generated: number
  host: string
  radar: {
    past: RainviewerRadarFrame[]
    nowcast?: RainviewerRadarFrame[]
  }
}

export function buildRadarTileUrlTemplate(host: string, path: string): string {
  const base = host.endsWith('/') ? host.slice(0, -1) : host
  const framePath = path.startsWith('/') ? path : `/${path}`
  return `${base}${framePath}/${RAINVIEWER_TILE_SIZE}/{z}/{x}/{y}/${RAINVIEWER_TILE_COLOR}/${RAINVIEWER_TILE_OPTIONS}.png`
}

export function parseLatestRadarFrame(
  manifest: RainviewerManifest
): { host: string; path: string } | null {
  const frames = manifest.radar?.past
  if (!frames?.length || !manifest.host) return null
  const latest = frames[frames.length - 1]
  if (!latest?.path) return null
  return { host: manifest.host, path: latest.path }
}

export function tileTemplateFromManifest(manifest: RainviewerManifest): string | null {
  const frame = parseLatestRadarFrame(manifest)
  if (!frame) return null
  return buildRadarTileUrlTemplate(frame.host, frame.path)
}
