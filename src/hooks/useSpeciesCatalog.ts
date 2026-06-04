import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type SpeciesCatalogItem = {
  id: string
  latinName: string
  sortOrder: number
  recordCount: number
}

type SpeciesListResponse = {
  species: SpeciesCatalogItem[]
}

export function useSpeciesCatalog(enabled = true) {
  return useQuery({
    queryKey: ["species-catalog"],
    queryFn: async (): Promise<SpeciesCatalogItem[]> => {
      const res = await fetch("/api/species")
      if (!res.ok) throw new Error("Failed to load species catalog")
      const data = (await res.json()) as SpeciesListResponse
      return data.species
    },
    enabled,
    staleTime: 30_000,
  })
}

export function useSpeciesCatalogMutations() {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["species-catalog"] })

  const create = useMutation({
    mutationFn: async (latinName: string) => {
      const res = await fetch("/api/species", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latinName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Nepodařilo se přidat druh")
      return data
    },
    onSuccess: async () => {
      await invalidate()
      await queryClient.invalidateQueries({ queryKey: ["records-filters"] })
      toast.success("Druh přidán")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const update = useMutation({
    mutationFn: async ({ id, latinName }: { id: string; latinName: string }) => {
      const res = await fetch(`/api/species/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latinName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Nepodařilo se upravit druh")
      return data
    },
    onSuccess: async () => {
      await invalidate()
      await queryClient.invalidateQueries({ queryKey: ["records-filters"] })
      toast.success("Druh upraven")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/species/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Nepodařilo se smazat druh")
      return data
    },
    onSuccess: async () => {
      await invalidate()
      await queryClient.invalidateQueries({ queryKey: ["records-filters"] })
      toast.success("Druh odstraněn z katalogu")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const importCsv = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/species/import", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Import se nezdařil")
      return data as {
        imported: number
        updated: number
        skipped: number
        errors: string[]
      }
    },
    onSuccess: async (result) => {
      await invalidate()
      await queryClient.invalidateQueries({ queryKey: ["records-filters"] })
      toast.success(
        `Import: ${result.imported} nových, ${result.updated} aktualizovaných`
      )
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} chyb při importu`)
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return { create, update, remove, importCsv }
}
