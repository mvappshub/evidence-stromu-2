import { describe, expect, it } from 'vitest'
import {
  destinationPoint,
  interpolatePointsAlongPolyline,
  polylineLengthMeters,
} from '@/lib/geodesic-line-points'

describe('geodesic-line-points', () => {
  it('places points every 2m on ~10m northward line', () => {
    const start = { lat: 50, lng: 14 }
    const end = destinationPoint(50, 14, 0, 10)
    const points = interpolatePointsAlongPolyline([start, end], 2)
    expect(points.length).toBe(6)
    expect(points[0]).toEqual(start)
    const len = polylineLengthMeters([start, end])
    expect(len).toBeGreaterThan(9)
    expect(len).toBeLessThan(11)
  })

  it('returns single point when spacing exceeds line length', () => {
    const a = { lat: 50, lng: 14 }
    const b = destinationPoint(50, 14, 90, 3)
    const points = interpolatePointsAlongPolyline([a, b], 10)
    expect(points).toHaveLength(1)
    expect(points[0]).toEqual(a)
  })

  it('walks a bent polyline', () => {
    const a = { lat: 50, lng: 14 }
    const b = destinationPoint(50, 14, 0, 5)
    const c = destinationPoint(b.lat, b.lng, 90, 5)
    const points = interpolatePointsAlongPolyline([a, b, c], 5)
    expect(points.length).toBeGreaterThanOrEqual(2)
    expect(points[0]).toEqual(a)
  })

  it('destinationPoint moves ~100m north', () => {
    const p = destinationPoint(50, 14, 0, 100)
    const dist = polylineLengthMeters([{ lat: 50, lng: 14 }, p])
    expect(dist).toBeGreaterThan(99)
    expect(dist).toBeLessThan(101)
  })
})
