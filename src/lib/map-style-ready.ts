import type maplibregl from 'maplibre-gl'

/** Spustí callback až je styl mapy připravený pro addSource/addLayer. */
export function runWhenStyleReady(map: maplibregl.Map, fn: () => void): void {
  if (map.isStyleLoaded()) {
    fn()
    return
  }

  const run = () => {
    map.off('load', run)
    map.off('style.load', run)
    if (map.isStyleLoaded()) fn()
  }

  map.once('load', run)
  map.once('style.load', run)
}
