import { RAINVIEWER_MANIFEST_TTL_MS, RAINVIEWER_MANIFEST_URL } from '@/lib/rainviewer-radar-config'
import {
  tileTemplateFromManifest,
  type RainviewerManifest,
} from '@/lib/rainviewer-radar'

let cachedTileUrl: string | null = null
let fetchedAt = 0

export function getCachedRadarTileUrl(): string | null {
  return cachedTileUrl
}

export function isRadarManifestStale(): boolean {
  if (!cachedTileUrl) return true
  return Date.now() - fetchedAt > RAINVIEWER_MANIFEST_TTL_MS
}

export async function fetchRadarTileUrl(): Promise<string | null> {
  if (!isRadarManifestStale()) return cachedTileUrl

  const res = await fetch(RAINVIEWER_MANIFEST_URL)
  if (!res.ok) return cachedTileUrl

  const manifest = (await res.json()) as RainviewerManifest
  const template = tileTemplateFromManifest(manifest)
  if (template) {
    cachedTileUrl = template
    fetchedAt = Date.now()
  }
  return cachedTileUrl
}
