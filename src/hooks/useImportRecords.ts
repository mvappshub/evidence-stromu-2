"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ImportRowInput, ImportResult } from "@/lib/import-records"
import { invalidateRecordsDomain } from "@/lib/query-invalidation"

export const IMPORT_RECORDS_HTTP_ERROR = "ImportRecordsHttpError"

export type ImportRecordsVariables = {
  records: ImportRowInput[]
}

export function useImportRecords() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      records,
    }: ImportRecordsVariables): Promise<ImportResult> => {
      const res = await fetch("/api/records/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      })

      const result = await res.json()

      if (!res.ok) {
        const err = new Error(result.error || "Chyba serveru")
        err.name = IMPORT_RECORDS_HTTP_ERROR
        throw err
      }

      return {
        imported: result.imported ?? 0,
        skipped: result.skipped ?? 0,
        errors: result.errors ?? [],
      }
    },
    onSuccess: async () => {
      await invalidateRecordsDomain(queryClient, {
        includeCount: true,
        includeFilters: true,
        includeStats: true,
        includeSpeciesCatalog: true,
      })
    },
  })
}
