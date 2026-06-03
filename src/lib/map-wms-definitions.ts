export type MapOverlayId = 'parcels' | 'transport' | 'utilities' | 'admin'

export type WmsVersion = '1.1.1' | '1.3.0'

export interface MapWmsDefinition {
  id: MapOverlayId
  label: string
  baseUrl: string
  layers: string
  minzoom?: number
  wmsVersion: WmsVersion
  /** Pro GetFeatureInfo (parcely) */
  queryable?: boolean
}

export const MAP_WMS_OVERLAYS: Record<MapOverlayId, MapWmsDefinition> = {
  parcels: {
    id: 'parcels',
    label: 'Parcely',
    baseUrl: 'https://services.cuzk.gov.cz/wms/local-km-wms.asp',
    layers: 'hranice_parcel',
    minzoom: 14,
    wmsVersion: '1.1.1',
    queryable: true,
  },
  transport: {
    id: 'transport',
    label: 'Doprava',
    baseUrl: 'https://dmvs.cuzk.gov.cz/api/wms/dtm_di_ver',
    layers: 'dtm_di_ver',
    minzoom: 12,
    wmsVersion: '1.3.0',
  },
  utilities: {
    id: 'utilities',
    label: 'Technické sítě',
    baseUrl: 'https://dmvs.cuzk.gov.cz/api/wms/dtm_ti_ver',
    layers: 'dtm_ti_ver',
    minzoom: 12,
    wmsVersion: '1.3.0',
  },
  admin: {
    id: 'admin',
    label: 'Hranice obcí',
    baseUrl: 'https://ags.cuzk.gov.cz/arcgis/services/RUIAN/MapServer/WMSServer',
    layers: 'Obec',
    minzoom: 10,
    wmsVersion: '1.1.1',
  },
}

export function buildWmsTileUrl(def: MapWmsDefinition): string {
  const layer = encodeURIComponent(def.layers)
  if (def.wmsVersion === '1.3.0') {
    return (
      `${def.baseUrl}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0` +
      `&LAYERS=${layer}&STYLES=&FORMAT=image/png&TRANSPARENT=true` +
      `&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256`
    )
  }
  return (
    `${def.baseUrl}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1` +
    `&LAYERS=${layer}&STYLES=&FORMAT=image/png&TRANSPARENT=true` +
    `&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256`
  )
}

/** Pořadí vkládání (spodní → horní mezi podkladem a stromy). */
export const MAP_OVERLAY_ORDER: MapOverlayId[] = [
  'admin',
  'transport',
  'utilities',
  'parcels',
]
