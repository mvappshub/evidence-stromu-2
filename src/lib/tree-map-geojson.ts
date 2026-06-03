/** Smlouva properties pro stromy na mapě (GET /api/records/geojson + MapLibre). */

export interface TreeMapFeatureProperties {
  recordNumber: number
  speciesLatin: string
  /** ISO string; prázdný řetězec = datum nezobrazeno (feature se nezahazuje). */
  plantedAt: string
  locality: string | null
}

export interface TreeMapGeoJsonFeature {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: TreeMapFeatureProperties
}

export interface TreeMapGeoJsonCollection {
  type: "FeatureCollection"
  features: TreeMapGeoJsonFeature[]
}

type RecordSlice = {
  recordNumber: number
  speciesLatin: string
  plantedAt: Date | string
  locality: string | null
  lat: number
  lng: number
}

/** Zápis — geojson route (jediné místo pro názvy klíčů v API odpovědi). */
export function treeMapPropertiesFromRecord(
  r: Pick<RecordSlice, "recordNumber" | "speciesLatin" | "plantedAt" | "locality">
): TreeMapFeatureProperties {
  return {
    recordNumber: r.recordNumber,
    speciesLatin: r.speciesLatin,
    plantedAt: normalizePlantedAt(r.plantedAt),
    locality: r.locality,
  }
}

export function treeMapFeatureFromRecord(r: RecordSlice): TreeMapGeoJsonFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [r.lng, r.lat] },
    properties: treeMapPropertiesFromRecord(r),
  }
}

function normalizePlantedAt(value: Date | string): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") return value
  return ""
}

/**
 * Čtení — jediné místo, které zná klíče properties (hooky + MapLibre events).
 * Vrací null jen při chybějícím recordNumber/speciesLatin; chybějící plantedAt → "".
 */
export function readTreeMapFeatureProperties(
  raw: unknown
): TreeMapFeatureProperties | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>

  const recordNumber = Number(o.recordNumber)
  if (!Number.isFinite(recordNumber)) return null

  if (typeof o.speciesLatin !== "string") return null

  let plantedAt = ""
  if (o.plantedAt instanceof Date) {
    plantedAt = o.plantedAt.toISOString()
  } else if (typeof o.plantedAt === "string") {
    plantedAt = o.plantedAt
  }

  const locality =
    o.locality == null || o.locality === "" ? null : String(o.locality)

  return { recordNumber, speciesLatin: o.speciesLatin, plantedAt, locality }
}
