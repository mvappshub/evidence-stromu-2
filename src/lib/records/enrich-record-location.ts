import { lookupObecByPoint } from '@/lib/ruian-locality'
import { lookupOrpByPoint } from '@/lib/ruian-orp'

export type RecordLocationEnrichment = {
  locality?: string
  orpKod?: number
}

export async function enrichRecordLocationFromCoords(
  lng: number,
  lat: number,
  options?: { fillLocality?: boolean }
): Promise<RecordLocationEnrichment> {
  const [orp, obec] = await Promise.all([
    lookupOrpByPoint(lng, lat),
    options?.fillLocality ? lookupObecByPoint(lng, lat) : Promise.resolve(null),
  ])

  const result: RecordLocationEnrichment = {}
  if (orp?.kod) result.orpKod = orp.kod
  if (obec?.nazev) result.locality = obec.nazev
  return result
}
