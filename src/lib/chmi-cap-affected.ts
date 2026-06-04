import type { ActiveCapAlert } from '@/lib/chmi-cap-parse'

export function countRecordsInOrpSet(
  records: Array<{ orpKod: number | null }>,
  orpCodes: number[]
): number {
  if (orpCodes.length === 0) return 0
  const set = new Set(orpCodes)
  return records.filter((r) => r.orpKod != null && set.has(r.orpKod)).length
}

export function countDistinctOrpsInSet(
  records: Array<{ orpKod: number | null }>,
  orpCodes: number[]
): number {
  if (orpCodes.length === 0) return 0
  const allowed = new Set(orpCodes)
  const matched = new Set<number>()
  for (const r of records) {
    if (r.orpKod != null && allowed.has(r.orpKod)) matched.add(r.orpKod)
  }
  return matched.size
}

export function treeCountPerAlert(
  records: Array<{ orpKod: number | null }>,
  alert: ActiveCapAlert
): number {
  return countRecordsInOrpSet(records, alert.orpCodes)
}
