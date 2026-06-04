export interface RuianOrp {
  nazev: string
  kod: number
}

const RUIAN_ORP_LAYER =
  'https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/MapServer/14/query'

export async function lookupOrpByPoint(
  lng: number,
  lat: number
): Promise<RuianOrp | null> {
  const params = new URLSearchParams({
    f: 'json',
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'nazev,kod',
    returnGeometry: 'false',
  })

  const res = await fetch(`${RUIAN_ORP_LAYER}?${params}`)
  if (!res.ok) return null

  const data = (await res.json()) as {
    features?: Array<{ attributes?: { nazev?: string; kod?: number } }>
  }

  const attrs = data.features?.[0]?.attributes
  if (!attrs?.nazev || attrs.kod == null) return null

  return {
    nazev: attrs.nazev,
    kod: attrs.kod,
  }
}
