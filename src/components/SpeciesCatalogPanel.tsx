'use client'

import { useRef, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/useUiStore'
import {
  useSpeciesCatalog,
  useSpeciesCatalogMutations,
} from '@/hooks/useSpeciesCatalog'

interface SpeciesCatalogPanelProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SpeciesCatalogPanel({ open, onOpenChange }: SpeciesCatalogPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const filterSpecies = useUiStore((s) => s.filterSpecies)
  const setFilterSpecies = useUiStore((s) => s.setFilterSpecies)

  const { data: species = [], isLoading, isError } = useSpeciesCatalog(open === true)
  const { create, update, remove, importCsv } = useSpeciesCatalogMutations()

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) return
    create.mutate(name, { onSuccess: () => setNewName('') })
  }

  const startEdit = (id: string, latinName: string) => {
    setEditingId(id)
    setEditName(latinName)
  }

  const saveEdit = () => {
    if (!editingId) return
    const name = editName.trim()
    if (!name) return
    update.mutate(
      { id: editingId, latinName: name },
      { onSuccess: () => setEditingId(null) }
    )
  }

  const handleSpeciesClick = (latinName: string) => {
    if (filterSpecies === latinName) {
      setFilterSpecies('')
    } else {
      setFilterSpecies(latinName)
    }
  }

  const handleImportFile = (file: File | undefined) => {
    if (!file) return
    importCsv.mutate(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col w-96 max-w-[calc(100vw-2rem)] max-h-[85vh] gap-0 p-0 overflow-hidden text-foreground sm:max-w-md">
        <DialogHeader className="shrink-0 px-4 py-3 border-b text-left">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-sm font-medium">Katalog druhů</DialogTitle>
            {filterSpecies ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setFilterSpecies('')}
              >
                <X className="size-3 mr-1" />
                Zrušit filtr
              </Button>
            ) : null}
          </div>
          <DialogDescription className="sr-only">
            Správa latinských názvů druhů, import z CSV a filtrování záznamů
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-4 py-3 border-b space-y-2">
          <div className="flex gap-1.5">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Latinský název…"
              className="h-7 text-xs font-mono italic"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button
              size="sm"
              className="h-7 px-2"
              onClick={handleAdd}
              disabled={create.isPending || !newName.trim()}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>

          <div className="flex gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleImportFile(e.target.files?.[0])}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={importCsv.isPending}
            >
              {importCsv.isPending ? (
                <Loader2 className="size-3 mr-1 animate-spin" />
              ) : (
                <Upload className="size-3 mr-1" />
              )}
              Import CSV
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            CSV: sloupec druh / species / latinName, nebo jeden název na řádek.
          </p>
        </div>

        <ScrollArea className="min-h-0 flex-1 max-h-[420px]">
          {isLoading ? (
            <div className="p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Načítání…
            </div>
          ) : isError ? (
            <div className="p-4 text-center text-xs text-destructive">
              Katalog se nepodařilo načíst.
            </div>
          ) : species.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Katalog je prázdný. Přidejte druh nebo importujte CSV.
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {species.map((item) => {
                const isSelected = filterSpecies === item.latinName
                const isEditing = editingId === item.id

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-2 py-1.5',
                      isSelected && 'bg-accent ring-1 ring-border'
                    )}
                  >
                    {isEditing ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-6 text-xs font-mono italic flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={saveEdit}>
                          OK
                        </Button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="flex-1 text-left min-w-0"
                          onClick={() => handleSpeciesClick(item.latinName)}
                        >
                          <span className="text-sm italic truncate block text-foreground">
                            {item.latinName}
                          </span>
                          {item.recordCount > 0 ? (
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {item.recordCount} záznamů
                            </span>
                          ) : null}
                        </button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 shrink-0"
                          title="Upravit"
                          onClick={() => startEdit(item.id, item.latinName)}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 shrink-0 text-destructive"
                          title="Smazat z katalogu"
                          onClick={() => remove.mutate(item.id)}
                          disabled={remove.isPending}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
