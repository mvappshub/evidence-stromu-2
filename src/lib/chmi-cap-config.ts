export const CHMI_CAP_PRIMARY_URL =
  'https://vystrahy-cr.chmi.cz/data/XOCZ50_OKPR.xml'

export const CHMI_CAP_FALLBACK_URL =
  'https://www.chmi.cz/files/portal/docs/meteo/radovky/XOCZ50_OKPR.xml'

export const CHMI_CAP_CACHE_TTL_MS = 12 * 60 * 1000

export const CHMI_ALERTS_INFO_URL =
  'https://www.chmi.cz/predpoved-pocasi/vystrahy'

/** Substrings (lowercase) that indicate a real tree-relevant hazard. */
export const CHMI_TREE_EVENT_KEYWORDS = [
  'mráz',
  'mraz',
  'náled',
  'naled',
  'vítr',
  'vitr',
  'větr',
  'vetr',
  'vichřic',
  'vichric',
  'bouřk',
  'bourk',
  'bouře',
  'bour',
  'vedr',
  'extrémn',
  'extremn',
  'kroup',
] as const

/** Substrings that mean „no active warning“ or non-tree hydrology. */
export const CHMI_EVENT_EXCLUDE_KEYWORDS = [
  'žádn',
  'zadn',
  'bez výstrah',
  'bez vystrah',
  'povod',
  'povodň',
  'povodn',
  'hydrolog',
  '0. stupně',
  '0. stupne',
] as const
