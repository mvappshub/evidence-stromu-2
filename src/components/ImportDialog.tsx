'use client'

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
import {
  FIELDS,
} from '@/lib/csv-import-fields'
import { useImportDialogState, type ImportDialogStep } from '@/hooks/useImportDialogState'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const {
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
    requiredFieldsMapped,
    handleFileDrop,
    handleFileSelect,
    runImport,
    handleOpenChange,
  } = useImportDialogState(onOpenChange)

  const steps: ImportDialogStep[] = ['upload', 'preview', 'mapping', 'importing', 'results']

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto dialog-accent-top">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-4 text-muted-foreground" />
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
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="size-3 text-muted-foreground" />}
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded',
                  step === s
                    ? 'bg-secondary text-secondary-foreground font-medium'
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
                ? 'border-primary bg-accent/50'
                : 'border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/50'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
          >
            <div className="size-14 rounded-full bg-muted flex items-center justify-center">
              <FileSpreadsheet className="size-6 text-primary" />
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
              <FileSpreadsheet className="size-4 text-muted-foreground" />
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
                disabled={!requiredFieldsMapped || importing}
                onClick={runImport}
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
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-sm font-medium">Probíhá import…</span>
            </div>
            <Progress
              value={importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}
              className="h-2"
            />
            <p className="text-xs text-muted-foreground text-center">
              {importProgress.current}/{importProgress.total} záznamů
            </p>
          </div>
        )}

        {/* ─── Step 5: Results ─────────────────────────────────────────── */}
        {step === 'results' && importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-primary">{importResult.imported}</div>
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
              <div className="flex items-center gap-2 justify-center text-primary">
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
