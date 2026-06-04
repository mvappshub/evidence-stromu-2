import { describe, expect, it } from 'vitest'
import {
  buildRadarTileUrlTemplate,
  parseLatestRadarFrame,
  tileTemplateFromManifest,
  type RainviewerManifest,
} from '@/lib/rainviewer-radar'

const mockManifest: RainviewerManifest = {
  version: '2.0',
  generated: 1609402525,
  host: 'https://tilecache.rainviewer.com',
  radar: {
    past: [
      { time: 1609401600, path: '/v2/radar/1609401600' },
      { time: 1609402200, path: '/v2/radar/1609402200' },
    ],
  },
}

describe('buildRadarTileUrlTemplate', () => {
  it('builds MapLibre tile URL with z/x/y placeholders', () => {
    expect(
      buildRadarTileUrlTemplate(
        'https://tilecache.rainviewer.com',
        '/v2/radar/1609402200'
      )
    ).toBe(
      'https://tilecache.rainviewer.com/v2/radar/1609402200/512/{z}/{x}/{y}/2/1_1.png'
    )
  })
})

describe('parseLatestRadarFrame', () => {
  it('returns the last past frame', () => {
    expect(parseLatestRadarFrame(mockManifest)).toEqual({
      host: 'https://tilecache.rainviewer.com',
      path: '/v2/radar/1609402200',
    })
  })

  it('returns null when past is empty', () => {
    expect(
      parseLatestRadarFrame({
        ...mockManifest,
        radar: { past: [] },
      })
    ).toBeNull()
  })
})

describe('tileTemplateFromManifest', () => {
  it('combines host and latest path into a tile template', () => {
    expect(tileTemplateFromManifest(mockManifest)).toBe(
      'https://tilecache.rainviewer.com/v2/radar/1609402200/512/{z}/{x}/{y}/2/1_1.png'
    )
  })
})
