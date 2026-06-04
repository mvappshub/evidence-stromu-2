import { haversineDistance } from '@/lib/haversine'

export type LatLng = { lat: number; lng: number }

const EARTH_RADIUS_M = 6_371_000
const ENDPOINT_EPSILON_M = 0.5

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

/** Bearing from point 1 to point 2 in degrees (0 = north). */
export function bearingBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δλ = toRad(lng2 - lng1)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/** Destination point given start, bearing (deg), and distance (m). */
export function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number
): LatLng {
  const δ = distanceM / EARTH_RADIUS_M
  const θ = toRad(bearingDeg)
  const φ1 = toRad(lat)
  const λ1 = toRad(lng)

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  )
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    )

  return { lat: toDeg(φ2), lng: toDeg(λ2) }
}

/** Total geodesic length of a polyline in meters. */
export function polylineLengthMeters(vertices: LatLng[]): number {
  let total = 0
  for (let i = 1; i < vertices.length; i++) {
    total += haversineDistance(
      vertices[i - 1].lat,
      vertices[i - 1].lng,
      vertices[i].lat,
      vertices[i].lng
    )
  }
  return total
}

function pointAtDistanceAlongPolyline(vertices: LatLng[], distanceM: number): LatLng | null {
  if (vertices.length === 0) return null
  if (distanceM <= 0) return { ...vertices[0] }

  let remaining = distanceM
  for (let i = 0; i < vertices.length - 1; i++) {
    const a = vertices[i]
    const b = vertices[i + 1]
    const segLen = haversineDistance(a.lat, a.lng, b.lat, b.lng)
    if (remaining <= segLen + ENDPOINT_EPSILON_M) {
      const brg = bearingBetween(a.lat, a.lng, b.lat, b.lng)
      return destinationPoint(a.lat, a.lng, brg, remaining)
    }
    remaining -= segLen
  }
  return null
}

/**
 * Points along a polyline every `spacingMeters` from the first vertex.
 * Includes start; no point beyond line end.
 */
export function interpolatePointsAlongPolyline(
  vertices: LatLng[],
  spacingMeters: number
): LatLng[] {
  if (vertices.length === 0) return []
  if (spacingMeters <= 0 || !Number.isFinite(spacingMeters)) {
    throw new Error('spacingMeters must be a positive number')
  }

  const totalLength = polylineLengthMeters(vertices)
  if (totalLength < ENDPOINT_EPSILON_M) {
    return [{ lat: vertices[0].lat, lng: vertices[0].lng }]
  }

  const result: LatLng[] = [{ lat: vertices[0].lat, lng: vertices[0].lng }]
  let dist = spacingMeters

  while (dist <= totalLength + ENDPOINT_EPSILON_M) {
    const pt = pointAtDistanceAlongPolyline(vertices, dist)
    if (!pt) break
    const last = result[result.length - 1]
    if (
      Math.abs(last.lat - pt.lat) > 1e-9 ||
      Math.abs(last.lng - pt.lng) > 1e-9
    ) {
      result.push(pt)
    }
    dist += spacingMeters
  }

  return result
}

export const MAX_LINE_PLACE_POINTS = 200

export function interpolatePointsAlongPolylineBounded(
  vertices: LatLng[],
  spacingMeters: number,
  maxPoints = MAX_LINE_PLACE_POINTS
): { points: LatLng[]; truncated: boolean } {
  const points = interpolatePointsAlongPolyline(vertices, spacingMeters)
  if (points.length <= maxPoints) {
    return { points, truncated: false }
  }
  return { points: points.slice(0, maxPoints), truncated: true }
}
