/**
 * ČÚZK ortofoto ČR — WMS (MapLibre raster + bbox).
 * REST dlaždice /arcgis1/.../tile/{z}/{y}/{x} vrací 404; WMS je spolehlivé.
 * @see https://ags.cuzk.gov.cz/arcgis1/services/ORTOFOTO_WM/MapServer/WMSServer
 */
export const CUZK_ORTOFOTO_WMS_URL =
  'https://ags.cuzk.gov.cz/arcgis1/services/ORTOFOTO_WM/MapServer/WMSServer' +
  '?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=0&STYLES=&FORMAT=image/png' +
  '&TRANSPARENT=false&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256'

/** @deprecated Použijte CUZK_ORTOFOTO_WMS_URL — REST tile endpoint nefunguje. */
export const CUZK_ORTOFOTO_TILE_URL = CUZK_ORTOFOTO_WMS_URL

export const CUZK_ORTOFOTO_MIN_ZOOM = 6

export const CUZK_ORTOFOTO_MAX_ZOOM = 20

export const CUZK_ORTOFOTO_ATTRIBUTION =
  '&copy; <a href="https://geoportal.cuzk.gov.cz/" target="_blank" rel="noopener noreferrer">ČÚZK</a>'
