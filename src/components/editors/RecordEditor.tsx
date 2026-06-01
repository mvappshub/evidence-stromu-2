'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import {
  CalendarDays,
  Trash2,
  Upload,
  ImageIcon,
  Loader2,
  TreePine,
  MapPin,
  FileText,
  Camera,
  Copy,
  Check,
  CopyPlus,
} from 'lucide-react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/useUiStore'
import { toast } from 'sonner'
import { wgs84ToSjtsk, formatDms, formatSjtsk } from '@/lib/coords'
import type { TreeRecord } from '@/lib/types'

const recordEditSchema = z.object({
  speciesLatin: z.string().min(1, 'Druh je povinný'),
  plantedAt: z.string().min(1, 'Datum výsadby je povinné'),
  lat: z.number().min(-90).max(90, 'Zeměpisná šířka musí být -90 až 90'),
  lng: z.number().min(-180).max(180, 'Zeměpisná délka musí být -180 až 180'),
  locality: z.string().nullable(),
  note: z.string().nullable(),
})

type RecordEditValues = z.infer<typeof recordEditSchema>

interface RecordEditorProps {
  record: TreeRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Small copy button for coordinate values */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-5 shrink-0 ml-1"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      type="button"
      title="Kopírovat"
    >
      {copied ? <Check className="size-3 text-green-600" /> : <Copy className="size-3 text-muted-foreground" />}
    </Button>
  )
}

export function RecordEditor({ record, open, onOpenChange }: RecordEditorProps) {
  const queryClient = useQueryClient()
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [savingGlow, setSavingGlow] = useState(false)

  const form = useForm<RecordEditValues>({
    resolver: zodResolver(recordEditSchema),
    defaultValues: {
      speciesLatin: '',
      plantedAt: '',
      lat: 0,
      lng: 0,
      locality: null,
      note: null,
    },
  })

  // Reset form when record changes
  useEffect(() => {
    if (record) {
      form.reset({
        speciesLatin: record.speciesLatin,
        plantedAt: record.plantedAt.slice(0, 10),
        lat: record.lat,
        lng: record.lng,
        locality: record.locality,
        note: record.note,
      })
      setPhotoPath(record.photoPath)
    }
  }, [record, form])

  const updateMutation = useMutation({
    mutationFn: async (data: RecordEditValues) => {
      if (!record) throw new Error('No record')
      const res = await fetch(`/api/records/${record.recordNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          photoPath,
        }),
      })
      if (!res.ok) throw new Error('Chyba při ukládání záznamu')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      setSavingGlow(true)
      setTimeout(() => setSavingGlow(false), 1200)
      onOpenChange(false)
      if (record) {
        toast.success('Záznam uložen', { description: `Záznam #${record.recordNumber} aktualizován` })
      }
    },
    onError: () => {
      toast.error('Chyba při ukládání')
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!record) throw new Error('No record')
      const offset = 0.0001
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speciesLatin: record.speciesLatin,
          plantedAt: record.plantedAt.slice(0, 10),
          lat: record.lat + offset,
          lng: record.lng + offset,
          locality: record.locality,
          note: record.note,
        }),
      })
      if (!res.ok) throw new Error('Chyba při kopírování záznamu')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      onOpenChange(false)
      const newRecordNumber = data?.record?.recordNumber
      toast.success('Záznam zkopírován', {
        description: newRecordNumber ? `Nový záznam #${newRecordNumber}` : undefined,
      })
    },
    onError: () => {
      toast.error('Chyba při kopírování')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!record) throw new Error('No record')
      const res = await fetch(`/api/records/${record.recordNumber}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Chyba při mazání záznamu')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['records-geojson'] })
      setSelectedRecordNumber(null)
      onOpenChange(false)
      if (record) {
        toast.success('Záznam smazán', { description: `Záznam #${record.recordNumber} byl odstraněn` })
      }
    },
    onError: () => {
      toast.error('Chyba při mazání')
    },
  })

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setPhotoPath(data.path)
    } catch (err) {
      console.error('Photo upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = (data: RecordEditValues) => {
    updateMutation.mutate(data)
  }

  if (!record) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-lg max-h-[90vh] overflow-y-auto dialog-accent-top', savingGlow && 'border-glow-active')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TreePine className="size-4 text-green-600" />
            Upravit záznam #{record.recordNumber}
          </DialogTitle>
          <DialogDescription>
            Upravte údaje o stromu
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Species */}
          <div className="space-y-1.5">
            <Label htmlFor="species" className="text-xs flex items-center gap-1.5">
              <TreePine className="size-3 text-green-600" />
              Druh (latinsky)
            </Label>
            <Input
              id="species"
              className="h-9 text-sm border-green-200 dark:border-green-900/50 focus-visible:ring-green-500/30"
              {...form.register('speciesLatin')}
            />
            {form.formState.errors.speciesLatin && (
              <p className="text-xs text-destructive">
                {form.formState.errors.speciesLatin.message}
              </p>
            )}
          </div>

          {/* Planted at */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <CalendarDays className="size-3 text-green-600" />
              Datum výsadby
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className={cn(
                    'h-9 text-sm justify-start text-left font-normal w-full',
                    !form.watch('plantedAt') && 'text-muted-foreground'
                  )}
                >
                  <CalendarDays className="mr-2 size-3.5" />
                  {form.watch('plantedAt')
                    ? format(new Date(form.watch('plantedAt')), 'd.M.yyyy', { locale: cs })
                    : 'Vyberte datum'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    form.watch('plantedAt')
                      ? new Date(form.watch('plantedAt'))
                      : undefined
                  }
                  onSelect={(date) => {
                    form.setValue('plantedAt', date ? format(date, 'yyyy-MM-dd') : '')
                    setCalendarOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.plantedAt && (
              <p className="text-xs text-destructive">
                {form.formState.errors.plantedAt.message}
              </p>
            )}
          </div>

          {/* Coordinates */}
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <MapPin className="size-3 text-green-600" />
              Souřadnice
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="lat" className="text-[10px] text-muted-foreground">Zem. šířka</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  className="h-9 text-sm font-mono text-xs"
                  {...form.register('lat', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lng" className="text-[10px] text-muted-foreground">Zem. délka</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  className="h-9 text-sm font-mono text-xs"
                  {...form.register('lng', { valueAsNumber: true })}
                />
              </div>
            </div>
            {(form.formState.errors.lat || form.formState.errors.lng) && (
              <p className="text-xs text-destructive">
                {(form.formState.errors.lat?.message || form.formState.errors.lng?.message)}
              </p>
            )}
            {/* Coordinate systems display */}
            {form.watch('lat') !== undefined && form.watch('lng') !== undefined && !isNaN(form.watch('lat')) && !isNaN(form.watch('lng')) && (() => {
              const lat = form.watch('lat')
              const lng = form.watch('lng')
              const dms = formatDms(lat, lng)
              const sjtsk = wgs84ToSjtsk(lat, lng)
              const sjtskStr = formatSjtsk(sjtsk.x, sjtsk.y)
              return (
                <div className="rounded-md border bg-muted/30 p-2 mt-1.5 space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-2.5" />
                    Souřadnicové systémy
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground w-16 shrink-0">Stupně</span>
                    <span className="text-[10px] font-mono">{dms}</span>
                    <CopyBtn text={dms} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground w-16 shrink-0">S-JTSK</span>
                    <span className="text-[10px] font-mono">{sjtskStr}</span>
                    <CopyBtn text={sjtskStr} />
                  </div>
                </div>
              )
            })()}
            {/* Fallback when coords are invalid */}
            {form.watch('lat') !== undefined && form.watch('lng') !== undefined && (isNaN(form.watch('lat')) || isNaN(form.watch('lng'))) && (
              <p className="text-[10px] text-muted-foreground">Zadejte platné souřadnice pro zobrazení dalších formátů</p>
            )}
          </div>

          {/* Locality */}
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="locality" className="text-xs flex items-center gap-1.5">
              <MapPin className="size-3 text-green-600" />
              Lokalita
            </Label>
            <Input
              id="locality"
              className="h-9 text-sm"
              placeholder="Např. Praha, Stromovka"
              {...form.register('locality')}
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs flex items-center gap-1.5">
              <FileText className="size-3 text-green-600" />
              Poznámka
            </Label>
            <Textarea
              id="note"
              className="text-sm min-h-[60px]"
              placeholder="Volitelná poznámka…"
              {...form.register('note')}
            />
          </div>

          {/* Photo */}
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Camera className="size-3 text-green-600" />
              Fotografie
            </Label>
            {photoPath ? (
              <div className="space-y-2">
                <div className="relative rounded-lg border overflow-hidden bg-muted aspect-video max-w-[300px]">
                  <img
                    src={photoPath}
                    alt="Foto stromu"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" className="gap-1" disabled={uploading} asChild>
                      <span>
                        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}
                        {uploading ? 'Nahrávám…' : 'Změnit foto'}
                      </span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => setPhotoPath(null)}
                  >
                    Odstranit
                  </Button>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer"
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={async (e) => {
                  e.preventDefault()
                  setIsDragOver(false)
                  const file = e.dataTransfer.files?.[0]
                  if (!file) return
                  setUploading(true)
                  try {
                    const formData = new FormData()
                    formData.append('photo', file)
                    const res = await fetch('/api/upload', { method: 'POST', body: formData })
                    if (!res.ok) throw new Error('Upload failed')
                    const data = await res.json()
                    setPhotoPath(data.path)
                  } catch (err) {
                    console.error('Photo drag-drop error:', err)
                  } finally {
                    setUploading(false)
                  }
                }}
              >
                <div className={cn(
                  "flex items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-all duration-200",
                  "border-muted-foreground/25 hover:border-green-400/50 hover:bg-green-50/50 dark:hover:bg-green-950/10",
                  "cursor-pointer",
                  isDragOver && "dash-border-animated photo-drag-over"
                )}>
                  <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Nahrát fotografii</p>
                    <p className="text-xs text-muted-foreground">Klikněte pro výběr nebo přetáhněte soubor</p>
                  </div>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <div className="flex items-center gap-1.5 mr-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={duplicateMutation.isPending}
                onClick={() => duplicateMutation.mutate()}
              >
                {duplicateMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CopyPlus className="size-3.5" />}
                Kopírovat
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                  >
                    <Trash2 className="size-3.5" />
                    Smazat záznam
                  </Button>
                </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Smazat záznam?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tato akce je nevratná. Záznam #{record.recordNumber} ({record.speciesLatin}) a všechny jeho připomínky budou trvale smazány.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Smazat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending}
              className="gap-1"
            >
              {updateMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Uložit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
