/** Bounding box ČR — upřednostní výsledky v Česku (minLon, minLat, maxLon, maxLat). */
export const CZ_PHOTON_BBOX = '12.09,48.55,18.86,51.06'

export interface PhotonPlace {
  id: string
  lng: number
  lat: number
  label: string
  subtitle: string | null
  zoom: number
}

interface PhotonFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: Record<string, string | undefined>
}

interface PhotonResponse {
  features: PhotonFeature[]
}

function zoomForOsmType(osmValue: string | undefined, osmKey: string | undefined): number {
  const v = (osmValue ?? osmKey ?? '').toLowerCase()
  if (['house', 'building', 'residential', 'address'].some((t) => v.includes(t))) return 17
  if (['street', 'road', 'path', 'pedestrian', 'footway'].some((t) => v.includes(t))) return 16
  if (['suburb', 'neighbourhood', 'quarter', 'locality'].some((t) => v.includes(t))) return 14
  if (['village', 'hamlet'].some((t) => v.includes(t))) return 13
  if (['town', 'city', 'municipality'].some((t) => v.includes(t))) return 12
  if (['state', 'region', 'county'].some((t) => v.includes(t))) return 9
  return 14
}

function formatPhotonLabel(props: Record<string, string | undefined>): {
  label: string
  subtitle: string | null
} {
  const name = props.name ?? props.street ?? props.city ?? props.country
  if (!name) {
    return { label: 'Neznámé místo', subtitle: null }
  }

  const parts: string[] = []
  if (props.housenumber && props.street) {
    parts.push(`${props.street} ${props.housenumber}`)
  } else if (props.street && props.street !== name) {
    parts.push(props.street)
  }
  if (props.postcode) parts.push(props.postcode)
  if (props.city && props.city !== name) parts.push(props.city)
  if (props.state && props.state !== props.city) parts.push(props.state)

  const subtitle = parts.length > 0 ? parts.join(', ') : null
  return { label: name, subtitle }
}

function featureToPlace(feature: PhotonFeature, index: number): PhotonPlace {
  const [lng, lat] = feature.geometry.coordinates
  const props = feature.properties
  const { label, subtitle } = formatPhotonLabel(props)
  const osmId = props.osm_id ?? `${lng},${lat}`

  return {
    id: `${props.osm_type ?? 'place'}-${osmId}-${index}`,
    lng,
    lat,
    label,
    subtitle,
    zoom: zoomForOsmType(props.osm_value, props.osm_key),
  }
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal
): Promise<PhotonPlace[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const params = new URLSearchParams({
    q,
    limit: '8',
    bbox: CZ_PHOTON_BBOX,
  })

  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal })
  if (!res.ok) {
    throw new Error(`Geocoding failed (${res.status})`)
  }

  const data = (await res.json()) as PhotonResponse
  return (data.features ?? []).map(featureToPlace)
}
