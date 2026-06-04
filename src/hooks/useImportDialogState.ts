'use client'

import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  areRequiredFieldsMapped,
  type CsvImportFieldKey,
} from '@/lib/csv-import-fields'
import {
  buildAutoColumnMapping,
  createEmptyColumnMapping,
  parseCsvText,
} from '@/lib/csv-import-parse'
import { mapCsvRowsToImportInputs } from '@/lib/csv-import-rows'
import {
  IMPORT_RECORDS_HTTP_ERROR,
  useImportRecords,
} from '@/hooks/useImportRecords'
import { toast } from 'sonner'

export type ImportDialogStep = 'upload' | 'preview' | 'mapping' | 'importing' | 'results'

type FieldKey = CsvImportFieldKey

export function useImportDialogState(onOpenChange: (open: boolean) => void) {
  const { mutateAsync: importRecordsAsync } = useImportRecords()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<ImportDialogStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawData, setRawData] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<FieldKey, string>>(createEmptyColumnMapping())
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    errors: string[]
  } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importing, setImporting] = useState(false)

  const processFile = useCallback((nextFile: File) => {
    setFile(nextFile)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows } = parseCsvText(text)
      setRawHeaders(headers)
      setRawData(rows)
      setMapping(buildAutoColumnMapping(headers))
      setStep('preview')
    }
    reader.readAsText(nextFile, 'utf-8')
  }, [])

  const handleFileDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv')) {
      processFile(droppedFile)
    }
  }, [processFile])

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }, [processFile])

  const runImport = useCallback(async () => {
    const records = mapCsvRowsToImportInputs(rawData, mapping)

    setImporting(true)
    setImportProgress({ current: 0, total: records.length })
    setStep('importing')

    try {
      const result = await importRecordsAsync({ records })

      setImportProgress({ current: records.length, total: records.length })
      setImportResult({
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
      })
      setStep('results')

      if (result.imported > 0) {
        toast.success('Import dokončen', {
          description: `Importováno ${result.imported} z ${records.length} záznamů`,
        })
      }
    } catch (error) {
      toast.error('Import selhal', {
        description:
          error instanceof Error && error.name === IMPORT_RECORDS_HTTP_ERROR
            ? error.message
            : 'Chyba sítě',
      })
      setStep('mapping')
    } finally {
      setImporting(false)
    }
  }, [importRecordsAsync, mapping, rawData])

  const reset = useCallback(() => {
    setStep('upload')
    setFile(null)
    setRawHeaders([])
    setRawData([])
    setMapping(createEmptyColumnMapping())
    setImportResult(null)
    setImporting(false)
    setImportProgress({ current: 0, total: 0 })
    setDragOver(false)
  }, [])

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      reset()
    }
    onOpenChange(open)
  }, [onOpenChange, reset])

  return {
    fileInputRef,
    step,
    setStep,
    file,
    rawHeaders,
    rawData,
    mapping,
    setMapping,
    importResult,
    dragOver,
    setDragOver,
    importProgress,
    importing,
    requiredFieldsMapped: areRequiredFieldsMapped(mapping),
    handleFileDrop,
    handleFileSelect,
    runImport,
    handleOpenChange,
  }
}
