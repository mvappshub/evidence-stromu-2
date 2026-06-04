'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { useUiStore } from '@/store/useUiStore'
import type { TreeRecord, Reminder } from '@/lib/types'
import { invalidateRecordsDomain } from '@/lib/query-invalidation'

interface FilterData {
  species: string[]
  localities: string[]
}

interface RecordsResponse {
  records: (TreeRecord & { reminders?: Reminder[] })[]
  count: number
}

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const setViewMode = useUiStore((s) => s.setViewMode)
  const setFilterSpecies = useUiStore((s) => s.setFilterSpecies)
  const setFilterLocality = useUiStore((s) => s.setFilterLocality)
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')

  // Fetch tree results
  const { data: treeData } = useQuery<RecordsResponse>({
    queryKey: ['global-search-trees', search],
    queryFn: async () => {
      const params = new URLSearchParams({ search, limit: '20' })
      const res = await fetch(`/api/records?${params}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: open && search.length > 0,
    staleTime: 0,
  })

  // Fetch filter options (species + localities)
  const { data: filterData } = useQuery<FilterData>({
    queryKey: ['records-filters'],
    queryFn: async () => {
      const res = await fetch('/api/records/filters')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: open,
    staleTime: 60_000,
  })

  // Filter species and localities by search term
  const matchingSpecies = search.length > 0
    ? (filterData?.species ?? []).filter((s) => s.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : []

  const matchingLocalities = search.length > 0
    ? (filterData?.localities ?? []).filter((l) => l.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : []

  // Reset search when dialog closes - use callback instead of effect
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch('')
    }
    onOpenChange(nextOpen)
  }, [onOpenChange])

  const handleSelectTree = useCallback((recordNumber: number) => {
    setSelectedRecordNumber(recordNumber)
    setViewMode('both')
    onOpenChange(false)
  }, [setSelectedRecordNumber, setViewMode, onOpenChange])

  const handleSelectSpecies = useCallback((species: string) => {
    setFilterSpecies(species)
    setViewMode('list')
    onOpenChange(false)
    void invalidateRecordsDomain(queryClient)
  }, [setFilterSpecies, setViewMode, onOpenChange, queryClient])

  const handleSelectLocality = useCallback((locality: string) => {
    setFilterLocality(locality)
    setViewMode('list')
    onOpenChange(false)
    void invalidateRecordsDomain(queryClient)
  }, [setFilterLocality, setViewMode, onOpenChange, queryClient])

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Globální vyhledávání"
      description="Hledejte stromy, druhy a lokality"
    >
      <CommandInput
        placeholder="Hledat stromy, druhy, lokality…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Žádné výsledky pro &quot;{search}&quot;</CommandEmpty>

        {/* Tree results */}
        {treeData?.records && treeData.records.length > 0 && (
          <CommandGroup heading="Stromy">
            {treeData.records.map((record) => (
              <CommandItem
                key={record.recordNumber}
                value={`tree-${record.recordNumber}-${record.speciesLatin}-${record.locality ?? ''}`}
                onSelect={() => handleSelectTree(record.recordNumber)}
              >
                <span className="flex items-center gap-2 w-full">
                  <span className="text-xs text-muted-foreground font-mono">#{record.recordNumber}</span>
                  <span className="italic font-medium">{record.speciesLatin}</span>
                  {record.locality && (
                    <span className="text-xs text-muted-foreground truncate">• {record.locality}</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {format(new Date(record.plantedAt), 'd.M.yyyy', { locale: cs })}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Species results */}
        {matchingSpecies.length > 0 && (
          <CommandGroup heading="Druhy">
            {matchingSpecies.map((species) => (
              <CommandItem
                key={`species-${species}`}
                value={`species-${species}`}
                onSelect={() => handleSelectSpecies(species)}
              >
                <span className="italic">{species}</span>
                <span className="ml-auto text-xs text-muted-foreground">Filtrovat druh</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Locality results */}
        {matchingLocalities.length > 0 && (
          <CommandGroup heading="Lokality">
            {matchingLocalities.map((locality) => (
              <CommandItem
                key={`locality-${locality}`}
                value={`locality-${locality}`}
                onSelect={() => handleSelectLocality(locality)}
              >
                <span>{locality}</span>
                <span className="ml-auto text-xs text-muted-foreground">Filtrovat lokalitu</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
