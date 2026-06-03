import type maplibregl from 'maplibre-gl'
import type { MapWmsDefinition } from '@/lib/map-wms-definitions'

export interface ParcelIdentifyResult {
  parcelNumber: string | null
  cadastralArea: string | null
  rawLabel: string | null
}

function parseFeatureInfoHtml(html: string): ParcelIdentifyResult {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const text = doc.body?.textContent?.replace(/\s+/g, ' ').trim() ?? ''

  const parcelMatch =
    text.match(/parceln[ií]\s*[čc][íi]slo[:\s]*([0-9/]+)/i) ??
    text.match(/(?:^|\s)([0-9]+\s*\/\s*[0-9]+)(?:\s|$)/)
  const kuMatch =
    text.match(/katastráln[íi]\s*územ[íi][:\s]*([^,;]+)/i) ??
    text.match(/k\.?\s*ú\.?[:\s]*([^,;]+)/i)

  return {
    parcelNumber: parcelMatch?.[1]?.trim() ?? null,
    cadastralArea: kuMatch?.[1]?.trim() ?? null,
    rawLabel: text.length > 0 && text.length < 500 ? text : null,
  }
}

export async function fetchParcelFeatureInfo(
  map: maplibregl.Map,
  def: MapWmsDefinition,
  point: maplibregl.Point
): Promise<ParcelIdentifyResult | null> {
  const canvas = map.getCanvas()
  const bbox = map.getBounds()
  const sw = bbox.getSouthWest()
  const ne = bbox.getNorthEast()
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetFeatureInfo',
    VERSION: '1.1.1',
    LAYERS: def.layers,
    QUERY_LAYERS: def.layers,
    STYLES: '',
    SRS: 'EPSG:3857',
    BBOX: `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`,
    WIDTH: String(canvas.width),
    HEIGHT: String(canvas.height),
    X: String(Math.round(point.x)),
    Y: String(Math.round(point.y)),
    INFO_FORMAT: 'text/html',
  })

  const url = `${def.baseUrl}?${params}`
  const res = await fetch(url)
  if (!res.ok) return null

  const html = await res.text()
  if (!html || html.includes('ServiceException')) return null

  const parsed = parseFeatureInfoHtml(html)
  if (!parsed.parcelNumber && !parsed.cadastralArea && !parsed.rawLabel) return null
  return parsed
}
