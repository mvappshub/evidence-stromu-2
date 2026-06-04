'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { usePlantStore } from '@/store/usePlantStore'
import { lookupObecByPoint } from '@/lib/ruian-locality'
import { invalidateRecordsDomain } from '@/lib/query-invalidation'

export function useMapRecordMutations() {
  const queryClient = useQueryClient()
  const activeSpecies = usePlantStore((s) => s.activeSpecies)
  const activeDate = usePlantStore((s) => s.activeDate)
  const activeLocality = usePlantStore((s) => s.activeLocality)
  const setActiveLocality = usePlantStore((s) => s.setActiveLocality)
  const setLastInsertedRecordNumber = usePlantStore((s) => s.setLastInsertedRecordNumber)
  const addToRecentSpecies = usePlantStore((s) => s.addToRecentSpecies)

  const createMutation = useMutation({
    mutationFn: async (data: { lat: number; lng: number }) => {
      const speciesLatin = activeSpecies.trim()
      const plantedAt = activeDate.trim()
      if (!speciesLatin || !plantedAt) {
        throw new Error('Vyplňte druh a datum výsadby v liště pod mapou')
      }

      const localitySent = activeLocality.trim() || null
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          speciesLatin,
          plantedAt,
          locality: localitySent,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const detail = Array.isArray(err.details)
          ? err.details.map((d: { message?: string }) => d.message).filter(Boolean).join(', ')
          : ''
        throw new Error(
          err.error && detail ? `${err.error}: ${detail}` : err.error || 'Nepodařilo se vytvořit záznam'
        )
      }
      const json = await res.json()
      return { ...json, localityWasEmpty: !localitySent }
    },
    onSuccess: async (data, variables) => {
      const rn: number = data.record?.recordNumber ?? data.recordNumber
      if (rn) {
        setLastInsertedRecordNumber(rn)
        toast.success('Strom vložen', { description: `Záznam #${rn} vytvořen` })
      }
      if (activeSpecies) addToRecentSpecies(activeSpecies)

      const localityEmpty = data.localityWasEmpty === true
      if (localityEmpty) {
        const obec = await lookupObecByPoint(variables.lng, variables.lat)
        if (obec) {
          setActiveLocality(obec.nazev)
          if (rn) {
            await fetch(`/api/records/${rn}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ locality: obec.nazev }),
            }).catch(() => undefined)
          }
          toast.info('Lokalita doplněna', { description: obec.nazev })
        }
      }

      await invalidateRecordsDomain(queryClient)
    },
    onError: (error) => {
      toast.error('Chyba', {
        description: error instanceof Error ? error.message : 'Nepodařilo se vložit strom',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      recordNumber,
      lat,
      lng,
    }: {
      recordNumber: number
      lat: number
      lng: number
    }) => {
      const res = await fetch(`/api/records/${recordNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      void invalidateRecordsDomain(queryClient)
      toast.success('Pozice aktualizována')
    },
  })

  const createMutateRef = useRef(createMutation.mutate)
  const updateMutateRef = useRef(updateMutation.mutate)
  useEffect(() => {
    createMutateRef.current = createMutation.mutate
  }, [createMutation.mutate])
  useEffect(() => {
    updateMutateRef.current = updateMutation.mutate
  }, [updateMutation.mutate])

  return { createMutateRef, updateMutateRef, updateMutation }
}
