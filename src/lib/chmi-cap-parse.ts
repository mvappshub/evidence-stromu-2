import { XMLParser } from 'fast-xml-parser'
import {
  CHMI_EVENT_EXCLUDE_KEYWORDS,
  CHMI_TREE_EVENT_KEYWORDS,
} from '@/lib/chmi-cap-config'

export interface ActiveCapAlert {
  id: string
  event: string
  severity?: string
  expires?: string
  orpCodes: number[]
}

export interface ParsedCapFeed {
  alerts: ActiveCapAlert[]
}

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  trimValues: true,
})

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

export function isNegatedCapEvent(event: string): boolean {
  const lower = event.toLowerCase()
  return CHMI_EVENT_EXCLUDE_KEYWORDS.some((kw) => lower.includes(kw))
}

export function isTreeRelevantCapEvent(event: string): boolean {
  const lower = event.toLowerCase()
  if (!lower || isNegatedCapEvent(lower)) return false
  return CHMI_TREE_EVENT_KEYWORDS.some((kw) => lower.includes(kw))
}

export function isCapAlertExpired(expires: string | undefined, now = Date.now()): boolean {
  if (!expires) return false
  const t = Date.parse(expires)
  if (Number.isNaN(t)) return false
  return t < now
}

function extractCisorpCodes(info: Record<string, unknown>): number[] {
  const codes = new Set<number>()
  for (const area of asArray(info.area as Record<string, unknown> | Record<string, unknown>[])) {
    for (const geocode of asArray(
      area.geocode as Record<string, unknown> | Record<string, unknown>[]
    )) {
      const valueName = normalizeText(geocode.valueName).toUpperCase()
      if (valueName !== 'CISORP') continue
      const raw = normalizeText(geocode.value)
      const kod = parseInt(raw, 10)
      if (Number.isFinite(kod) && kod > 0) codes.add(kod)
    }
  }
  return [...codes]
}

function parseInfoBlock(
  info: Record<string, unknown>,
  alertId: string,
  index: number,
  now: number
): ActiveCapAlert | null {
  const event = normalizeText(info.event)
  if (!isTreeRelevantCapEvent(event)) return null

  const expires = normalizeText(info.expires) || undefined
  if (isCapAlertExpired(expires, now)) return null

  const orpCodes = extractCisorpCodes(info)
  if (orpCodes.length === 0) return null

  const severity = normalizeText(info.severity) || undefined
  return {
    id: `${alertId}-${index}`,
    event,
    severity,
    expires,
    orpCodes,
  }
}

export function parseChmiCapXml(xml: string, now = Date.now()): ParsedCapFeed {
  const doc = xmlParser.parse(xml) as { alert?: Record<string, unknown> }
  const alert = doc.alert
  if (!alert) return { alerts: [] }

  const alertId = normalizeText(alert.identifier) || 'cap'
  const alerts: ActiveCapAlert[] = []

  asArray(alert.info as Record<string, unknown> | Record<string, unknown>[]).forEach(
    (info, index) => {
      const parsed = parseInfoBlock(info, alertId, index, now)
      if (parsed) alerts.push(parsed)
    }
  )

  return { alerts }
}

export function unionOrpCodes(alerts: ActiveCapAlert[]): number[] {
  const set = new Set<number>()
  for (const alert of alerts) {
    for (const kod of alert.orpCodes) set.add(kod)
  }
  return [...set]
}
