/** Map layer colors — data only, separate from UI chrome (DevTools link-blue scale). */
export const MAP_COLORS = {
  cluster: ['#86efac', '#4ade80', '#22c55e', '#166534'] as const,
  point: '#166534',
  pointSelectedStroke: '#fbbf24',
  heatmap: [
    'rgba(0,0,0,0)',
    'rgba(34,197,94,0.2)',
    'rgba(34,197,94,0.45)',
    'rgba(22,163,74,0.7)',
    'rgba(21,128,61,0.9)',
    'rgba(22,101,52,0.95)',
  ] as const,
} as const

/** Vyšší kontrast na ortofoto / satelitu. */
export const MAP_COLORS_AERIAL = {
  cluster: ['#bbf7d0', '#4ade80', '#15803d', '#14532d'] as const,
  point: '#15803d',
  pointSelectedStroke: '#ffffff',
  heatmap: [
    'rgba(0,0,0,0)',
    'rgba(74,222,128,0.35)',
    'rgba(34,197,94,0.55)',
    'rgba(22,163,74,0.75)',
    'rgba(21,128,61,0.9)',
    'rgba(20,83,45,0.95)',
  ] as const,
} as const

/** Náhled řady / vkládání po čáře na mapě */
export const MAP_LINE_PLACE = {
  line: '#16a34a',
  previewPoint: '#166534',
  vertex: '#22c55e',
} as const
