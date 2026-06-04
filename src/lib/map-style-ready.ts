import type maplibregl from 'maplibre-gl'

/**
 * Spustí callback až lze bezpečně volat addSource/addLayer.
 * Volání z handleru `style.load` může proběhnout dřív, než `isStyleLoaded()` vrátí true —
 * proto po signálu vždy callback spustíme (s jedním opakováním na `idle` při výjimce).
 */
export function runWhenStyleReady(map: maplibregl.Map, fn: () => void): void {
  const invoke = () => {
    try {
      fn()
    } catch {
      map.once('idle', fn)
    }
  }

  if (map.isStyleLoaded()) {
    invoke()
    return
  }

  const onSignal = () => {
    map.off('load', onSignal)
    map.off('style.load', onSignal)
    map.off('idle', onSignal)
    invoke()
  }

  map.once('load', onSignal)
  map.once('style.load', onSignal)
  map.once('idle', onSignal)
}
