import { describe, expect, it, vi } from 'vitest'
import { invalidateRecordsDomain, invalidateReminderDomain } from '@/lib/query-invalidation'

describe('query invalidation helpers', () => {
  it('invalidates the records domain with selected optional queries', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = { invalidateQueries } as const

    await invalidateRecordsDomain(queryClient as never, {
      includeCount: true,
      includeFilters: true,
      includeStats: true,
      includeActivityLog: true,
      includeRecord: 42,
    })

    expect(invalidateQueries).toHaveBeenCalledTimes(7)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['records'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['records-geojson'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['records-count'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['records-filters'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['records-stats'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['activity-log'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['record', 42] })
  })

  it('invalidates reminder due queries together with records', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = { invalidateQueries } as const

    await invalidateReminderDomain(queryClient as never)

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['records'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['records-geojson'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reminders-due'] })
  })
})
