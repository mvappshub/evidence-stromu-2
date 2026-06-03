export interface RuianObec {
  nazev: string
  kod: number
}

const RUIAN_OBEC_LAYER =
  'https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/MapServer/12/query'

export async function lookupObecByPoint(
  lng: number,
  lat: number
): Promise<RuianObec | null> {
  const params = new URLSearchParams({
    f: 'json',
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'nazev,kod',
    returnGeometry: 'false',
  })

  const res = await fetch(`${RUIAN_OBEC_LAYER}?${params}`)
  if (!res.ok) return null

  const data = (await res.json()) as {
    features?: Array<{ attributes?: { nazev?: string; kod?: number } }>
  }

  const attrs = data.features?.[0]?.attributes
  if (!attrs?.nazev) return null

  return {
    nazev: attrs.nazev,
    kod: attrs.kod ?? 0,
  }
}
