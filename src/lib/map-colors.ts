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
