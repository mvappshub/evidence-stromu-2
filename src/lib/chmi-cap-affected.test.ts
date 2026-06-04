import { describe, expect, it } from 'vitest'
import { countDistinctOrpsInSet, countRecordsInOrpSet } from '@/lib/chmi-cap-affected'

describe('chmi-cap-affected', () => {
  const records = [
    { orpKod: 2101 },
    { orpKod: 2101 },
    { orpKod: 2102 },
    { orpKod: null },
    { orpKod: 3201 },
  ]

  it('counts records in ORP set', () => {
    expect(countRecordsInOrpSet(records, [2101, 2102])).toBe(3)
    expect(countRecordsInOrpSet(records, [1100])).toBe(0)
  })

  it('counts distinct ORPs', () => {
    expect(countDistinctOrpsInSet(records, [2101, 2102, 3201])).toBe(3)
  })
})
