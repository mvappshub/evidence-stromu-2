import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

const MAX_SPAN = 0.25
const MAX_FEATURES = 500
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const minLng = Number(searchParams.get('minLng'))
  const minLat = Number(searchParams.get('minLat'))
  const maxLng = Number(searchParams.get('maxLng'))
  const maxLat = Number(searchParams.get('maxLat'))

  if (
    [minLng, minLat, maxLng, maxLat].some((n) => Number.isNaN(n)) ||
    minLng >= maxLng ||
    minLat >= maxLat
  ) {
    return NextResponse.json({ error: 'Invalid bbox' }, { status: 400 })
  }

  if (maxLng - minLng > MAX_SPAN || maxLat - minLat > MAX_SPAN) {
    return NextResponse.json({ error: 'Bbox too large' }, { status: 400 })
  }

  const query = `
    [out:json][timeout:25];
    node["natural"="tree"](${minLat},${minLng},${maxLat},${maxLng});
    out body;
  `

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Overpass request failed' }, { status: 502 })
  }

  const data = (await res.json()) as {
    elements?: Array<{ type: string; id: number; lat?: number; lon?: number }>
  }

  const features = (data.elements ?? [])
    .filter((el) => el.type === 'node' && el.lat != null && el.lon != null)
    .slice(0, MAX_FEATURES)
    .map((el) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [el.lon!, el.lat!] as [number, number],
      },
      properties: { osmId: el.id },
    }))

  return NextResponse.json({
    type: 'FeatureCollection',
    features,
  })
}
