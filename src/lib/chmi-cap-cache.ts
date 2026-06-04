import {
  CHMI_CAP_CACHE_TTL_MS,
  CHMI_CAP_FALLBACK_URL,
  CHMI_CAP_PRIMARY_URL,
} from '@/lib/chmi-cap-config'
import { parseChmiCapXml, type ParsedCapFeed } from '@/lib/chmi-cap-parse'

let cachedFeed: ParsedCapFeed | null = null
let fetchedAt = 0

export function getCachedCapFeed(): ParsedCapFeed | null {
  return cachedFeed
}

export function isCapFeedStale(): boolean {
  if (!cachedFeed) return true
  return Date.now() - fetchedAt > CHMI_CAP_CACHE_TTL_MS
}

async function fetchCapXml(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { Accept: 'application/xml, text/xml, */*' },
    next: { revalidate: 0 },
  })
  if (!res.ok) return null
  return res.text()
}

export async function fetchCapFeed(): Promise<ParsedCapFeed | null> {
  if (!isCapFeedStale()) return cachedFeed

  let xml = await fetchCapXml(CHMI_CAP_PRIMARY_URL)
  if (!xml) xml = await fetchCapXml(CHMI_CAP_FALLBACK_URL)
  if (!xml) return cachedFeed

  const parsed = parseChmiCapXml(xml)
  cachedFeed = parsed
  fetchedAt = Date.now()
  return cachedFeed
}
