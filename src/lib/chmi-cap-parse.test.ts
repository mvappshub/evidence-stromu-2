import { describe, expect, it } from 'vitest'
import {
  isCapAlertExpired,
  isNegatedCapEvent,
  isTreeRelevantCapEvent,
  parseChmiCapXml,
  unionOrpCodes,
} from '@/lib/chmi-cap-parse'

const FIXTURE_FROST = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>test-frost-001</identifier>
  <info>
    <language>cs</language>
    <event>Přízemní mráz</event>
    <severity>Moderate</severity>
    <expires>2099-06-01T16:00:00+02:00</expires>
    <area>
      <geocode>
        <valueName>CISORP</valueName>
        <value>2101</value>
      </geocode>
      <geocode>
        <valueName>CISORP</valueName>
        <value>2102</value>
      </geocode>
    </area>
  </info>
  <info>
    <event>Žádná výstraha před větrem</event>
    <expires>2099-06-01T16:00:00+02:00</expires>
    <area>
      <geocode>
        <valueName>CISORP</valueName>
        <value>1100</value>
      </geocode>
    </area>
  </info>
  <info>
    <event>Výstraha před větrem</event>
    <expires>2000-01-01T00:00:00+01:00</expires>
    <area>
      <geocode>
        <valueName>CISORP</valueName>
        <value>3201</value>
      </geocode>
    </area>
  </info>
</alert>`

describe('isTreeRelevantCapEvent', () => {
  it('accepts frost and wind warnings', () => {
    expect(isTreeRelevantCapEvent('Přízemní mráz')).toBe(true)
    expect(isTreeRelevantCapEvent('Výstraha před větrem')).toBe(true)
  })

  it('rejects negated and flood events', () => {
    expect(isNegatedCapEvent('Žádná výstraha před větrem')).toBe(true)
    expect(isTreeRelevantCapEvent('Žádná výstraha před větrem')).toBe(false)
    expect(isTreeRelevantCapEvent('Výstraha před povodněmi')).toBe(false)
  })
})

describe('parseChmiCapXml', () => {
  it('extracts CISORP codes for active tree-relevant info only', () => {
    const { alerts } = parseChmiCapXml(FIXTURE_FROST)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].event).toBe('Přízemní mráz')
    expect(alerts[0].orpCodes).toEqual([2101, 2102])
  })

  it('drops expired warnings', () => {
    const { alerts } = parseChmiCapXml(FIXTURE_FROST)
    expect(alerts.some((a) => a.orpCodes.includes(3201))).toBe(false)
  })

  it('unions ORP codes across alerts', () => {
    const { alerts } = parseChmiCapXml(FIXTURE_FROST)
    expect(unionOrpCodes(alerts)).toEqual([2101, 2102])
  })
})

describe('isCapAlertExpired', () => {
  it('detects past expires', () => {
    expect(isCapAlertExpired('2000-01-01T00:00:00+01:00')).toBe(true)
    expect(isCapAlertExpired('2099-06-01T16:00:00+02:00')).toBe(false)
  })
})
