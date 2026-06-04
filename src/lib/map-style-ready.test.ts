import { describe, expect, it, vi } from 'vitest'
import type maplibregl from 'maplibre-gl'
import { runWhenStyleReady } from './map-style-ready'

function createMapStub(opts: { styleLoaded: boolean }) {
  const listeners: Record<string, Array<() => void>> = {
    load: [],
    'style.load': [],
    idle: [],
  }

  const map = {
    isStyleLoaded: () => opts.styleLoaded,
    once: vi.fn((event: string, fn: () => void) => {
      listeners[event]?.push(fn)
    }),
    off: vi.fn((event: string, fn: () => void) => {
      const list = listeners[event]
      if (!list) return
      const i = list.indexOf(fn)
      if (i >= 0) list.splice(i, 1)
    }),
    emit: (event: string) => {
      listeners[event]?.forEach((fn) => fn())
    },
  }

  return map as unknown as maplibregl.Map & { emit: (event: string) => void }
}

describe('runWhenStyleReady', () => {
  it('runs immediately when style is loaded', () => {
    const map = createMapStub({ styleLoaded: true })
    const fn = vi.fn()
    runWhenStyleReady(map, fn)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('runs on style.load even when isStyleLoaded is still false', () => {
    const map = createMapStub({ styleLoaded: false })
    const fn = vi.fn()
    runWhenStyleReady(map, fn)
    expect(fn).not.toHaveBeenCalled()
    map.emit('style.load')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
