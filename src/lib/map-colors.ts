/** Map layer colors — data only, separate from UI chrome (DevTools link-blue scale). */
export const MAP_COLORS = {
  cluster: ['#8b949e', '#6e7681', '#484f58', '#30363d'] as const,
  point: '#58a6ff',
  pointSelectedStroke: '#d29922',
  heatmap: [
    'rgba(0,0,0,0)',
    'rgba(88,166,255,0.2)',
    'rgba(88,166,255,0.45)',
    'rgba(88,166,255,0.7)',
    'rgba(56,139,253,0.9)',
    'rgba(31,111,235,0.95)',
  ] as const,
} as const

/** Vyšší kontrast na ortofoto / satelitu (zelený podklad vs. modré body). */
export const MAP_COLORS_AERIAL = {
  cluster: ['#fde68a', '#fbbf24', '#f59e0b', '#d97706'] as const,
  point: '#fef08a',
  pointSelectedStroke: '#1e293b',
  heatmap: [
    'rgba(0,0,0,0)',
    'rgba(254,240,138,0.35)',
    'rgba(251,191,36,0.55)',
    'rgba(245,158,11,0.75)',
    'rgba(217,119,6,0.9)',
    'rgba(180,83,9,0.95)',
  ] as const,
} as const
