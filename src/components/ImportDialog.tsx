'use client'

import { useState, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'mapping' | 'importing' | 'results'

const FIELDS = [
  { key: 'speciesLatin', label: 'Druh', required: true },
  { key: 'plantedAt', label: 'Datum výsadby', required: true },
  { key: 'lat', label: 'Zem. šířka', required: true },
  { key: 'lng', label: 'Zem. délka', required: true },
  { key: 'locality', label: 'Lokalita', required: false },
  { key: 'note', label: 'Poznámka', required: false },
] as const

type FieldKey = (typeof FIELDS)[number]['key']

// Czech and English header auto-detection
const HEADER_MAP: Record<string, FieldKey> = {
  "druh": "speciesLatin",
  "species": "speciesLatin",
  "datum výsadby": "plantedAt",
  "datum_vysadby": "plantedAt",
  "date": "plantedAt",
  "zem. šířka": "lat",
  "zem_sirka": "lat",
  "zem.širka": "lat",
  "lat": "lat",
  "latitude": "lat",
  "zem. délka": "lng",
  "zem_delka": "lng",
  "zem.delka": "lng",
  "lng": "lng",
  "lon": "lng",
  "longitude": "lng",
  "lokalita": "locality",
  "locality": "locality",
  "location": "locality",
  "poznámka": "note",
  "poznamka": "note",
  "note": "note",
}

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawData, setRawData] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({
    speciesLatin: '',
    plantedAt: '',
    lat: '',
    lng: '',
    locality: '',
    note: '',
  })
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    errors: string[]
  } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // ─── File handling ──────────────────────────────────────────────────────

  const processFile = useCallback((f: File) => {
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = (e.target?.result as string).replace(/^\uFEFF/, '')
      
      // Try semicolon first, then comma, then auto-detect
      let result = Papa.parse(text, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
      })

      let headers = result.meta.fields ?? []
      let data = result.data as Record<string, string>[]

      if (headers.length <= 1 && text.includes(',')) {
        const commaResult = Papa.parse(text, {
          header: true,
          delimiter: ',',
          skipEmptyLines: true,
        })
        if ((commaResult.meta.fields ?? []).length > headers.length) {
          headers = commaResult.meta.fields ?? []
          data = commaResult.data as Record<string, string>[]
        }
      }

      if (headers.length <= 1) {
        const autoResult = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        })
        if ((autoResult.meta.fields ?? []).length > headers.length) {
          headers = autoResult.meta.fields ?? []
          data = autoResult.data as Record<string, string>[]
        }
      }

      setRawHeaders(headers)
      setRawData(data)

      // Auto-detect mapping
      const autoMap: Record<FieldKey, string> = {
        speciesLatin: '',
        plantedAt: '',
        lat: '',
        lng: '',
        locality: '',
        note: '',
      }

      for (const h of headers) {
        const normalized = h.trim().toLowerCase()
        const fieldKey = HEADER_MAP[normalized]
        if (fieldKey && !autoMap[fieldKey]) {
          autoMap[fieldKey] = h
        }
      }

      setMapping(autoMap)
      setStep('preview')
    }
    reader.readAsText(f, 'utf-8')
  }, [])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) {
      processFile(f)
    }
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }, [processFile])

  // ─── Import mutation ───────────────────────────────────────────────────

  const importMutation = useMutation({
    mutationFn: async () => {
      // Build the CSV with mapped columns from the parsed data
      const mappedRows: Record<string, string>[] = []
      for (const row of rawData) {
        const mappedRow: Record<string, string> = {}
        for (const field of FIELDS) {
          const csvCol = mapping[field.key]
          mappedRow[field.key] = csvCol ? (row[csvCol]?.trim() ?? '') : ''
        }
        mappedRows.push(mappedRow)
      }

      // Create a new CSV with standard headers
      const csvHeaders = ['Druh', 'Datum výsadby', 'Zem. šířka', 'Zem. délka', 'Lokalita', 'Poznámka']
      const csvRows = mappedRows.map((r) =>
        [
          r.speciesLatin,
          r.plantedAt,
          r.lat,
          r.lng,
          r.locality,
          r.note,
        ].map((v) => {
          if (v.includes(';') || v.includes('"') || v.includes('\n')) {
            return `"${v.replace(/"/g, '""')}"`
          }
          return v
        }).join(';')
      )

      const csv = '\uFEFF' + [csvHeaders.join(';'), ...csvRows].join('\r\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const formData = new FormData()
      formData.append('file', blob, 'import.csv')

      const res = await fetch('/api/records/import', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Chyba při importu')
      }

      return res.json() as Promise<{ imported: number; skipped: number; errors: string[] }>
    },
    onSuccess: (data) => {
      setImportResult(data)
      setStep('results')
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      queryClient.invalidateQueries({ queryKey: ['records-filters'] })
      if (data.imported > 0) {
        toast.success('Import dokončen', {
          description: `Importováno ${data.imported} záznamů`,
        })
      }
    },
    onError: (err) => {
      toast.error('Chyba při importu', { description: err.message })
      setStep('mapping')
    },
  })

  // ─── Mapping validation ────────────────────────────────────────────────

  const requiredFieldsMapped = FIELDS.filter((f) => f.required).every(
    (f) => mapping[f.key] !== ''
  )

  // ─── Reset ──────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setStep('upload')
    setFile(null)
    setRawHeaders([])
    setRawData([])
    setMapping({
      speciesLatin: '',
      plantedAt: '',
      lat: '',
      lng: '',
      locality: '',
      note: '',
    })
    setImportResult(null)
    importMutation.reset()
  }, [importMutation])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }, [reset, onOpenChange])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto dialog-accent-top">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-4 text-green-600" />
            Importovat záznamy
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Nahrajte CSV soubor s daty stromů'}
            {step === 'preview' && 'Náhled nahraných dat'}
            {step === 'mapping' && 'Přiřaďte sloupce z CSV k polím záznamu'}
            {step === 'importing' && 'Probíhá import…'}
            {step === 'results' && 'Výsledek importu'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 text-xs">
          {(['upload', 'preview', 'mapping', 'importing', 'results'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="size-3 text-muted-foreground" />}
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded',
                  step === s
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {s === 'upload' ? 'Soubor' : s === 'preview' ? 'Náhled' : s === 'mapping' ? 'Mapování' : s === 'importing' ? 'Import' : 'Výsledek'}
              </span>
            </div>
          ))}
        </div>

        {/* ─── Step 1: Upload ─────────────────────────────────────────── */}
        {step === 'upload' && (
          <div
            className={cn(
              'flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors',
              dragOver
                ? 'border-green-400 bg-green-50/50 dark:bg-green-950/20'
                : 'border-muted-foreground/25 hover:border-green-400/50 hover:bg-green-50/30 dark:hover:bg-green-950/10'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
          >
            <div className="size-14 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <FileSpreadsheet className="size-6 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Nahrajte CSV soubor</p>
              <p className="text-xs text-muted-foreground mt-1">
                Přetáhněte soubor sem, nebo klikněte pro výběr
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Maximálně 5 MB, 5000 záznamů • UTF-8 s BOM
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <Upload className="size-3.5" />
              Vybrat soubor
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* ─── Step 2: Preview ────────────────────────────────────────── */}
        {step === 'preview' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="size-4 text-green-600" />
              <span className="font-medium">{file?.name}</span>
              <span className="text-muted-foreground">
                ({rawData.length} {rawData.length === 1 ? 'záznam' : rawData.length < 5 ? 'záznamy' : 'záznamů'})
              </span>
            </div>

            <div className="rounded-lg border overflow-auto max-h-64">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    {rawHeaders.map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawData.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="border-t">
                      {rawHeaders.map((h) => (
                        <td key={h} className="px-2 py-1 whitespace-nowrap max-w-[150px] truncate">
                          {row[h] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rawData.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                Zobrazeno prvních 5 z {rawData.length} záznamů
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                <ArrowLeft className="size-3.5 mr-1" />
                Zpět
              </Button>
              <Button
                size="sm"
                className="gap-1"
                onClick={() => setStep('mapping')}
              >
                Pokračovat
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Column mapping ─────────────────────────────────── */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Přiřaďte sloupce z CSV souboru k polím záznamu. Povinná pole jsou označena *.
            </p>

            <div className="space-y-3">
              {FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <Label className="w-32 text-xs flex items-center gap-1 shrink-0">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    value={mapping[field.key]}
                    onValueChange={(val) =>
                      setMapping((prev) => ({ ...prev, [field.key]: val === '__none__' ? '' : val }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="— nepřiřazeno —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— nepřiřazeno —</SelectItem>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview with mapping */}
            {requiredFieldsMapped && rawData.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Náhled mapování:</p>
                <div className="rounded-lg border overflow-auto max-h-32">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        {FIELDS.filter((f) => mapping[f.key]).map((f) => (
                          <th key={f.key} className="px-2 py-1 text-left font-medium whitespace-nowrap">
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawData.slice(0, 3).map((row, idx) => (
                        <tr key={idx} className="border-t">
                          {FIELDS.filter((f) => mapping[f.key]).map((f) => (
                            <td key={f.key} className="px-2 py-1 whitespace-nowrap max-w-[150px] truncate">
                              {row[mapping[f.key]] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep('preview')}>
                <ArrowLeft className="size-3.5 mr-1" />
                Zpět
              </Button>
              <Button
                size="sm"
                className="gap-1"
                disabled={!requiredFieldsMapped}
                onClick={() => {
                  setStep('importing')
                  importMutation.mutate()
                }}
              >
                <Upload className="size-3.5" />
                Importovat
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 4: Importing ──────────────────────────────────────── */}
        {step === 'importing' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="size-5 animate-spin text-green-600" />
              <span className="text-sm font-medium">Probíhá import…</span>
            </div>
            <Progress value={45} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Importuje se {rawData.length} {rawData.length === 1 ? 'záznam' : rawData.length < 5 ? 'záznamy' : 'záznamů'}
            </p>
          </div>
        )}

        {/* ─── Step 5: Results ─────────────────────────────────────────── */}
        {step === 'results' && importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                <div className="text-xs text-muted-foreground">Importováno</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-orange-500">{importResult.skipped}</div>
                <div className="text-xs text-muted-foreground">Přeskočeno</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600">
                  <AlertTriangle className="size-3.5" />
                  Chyby ({importResult.errors.length})
                </div>
                <div className="rounded-lg border max-h-40 overflow-y-auto text-xs bg-muted/30">
                  {importResult.errors.map((err, idx) => (
                    <div key={idx} className="px-3 py-1.5 border-b last:border-b-0 text-muted-foreground">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importResult.skipped === 0 && (
              <div className="flex items-center gap-2 justify-center text-green-600">
                <Check className="size-5" />
                <span className="text-sm font-medium">Všechny záznamy byly úspěšně importovány</span>
              </div>
            )}

            <div className="flex justify-end">
              <Button size="sm" onClick={() => handleOpenChange(false)}>
                <Check className="size-3.5 mr-1" />
                Dokončit
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
