'use client'

import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useUiStore } from '@/store/useUiStore'
import { usePlantStore } from '@/store/usePlantStore'

const shortcuts = [
  { keys: 'M', description: 'Zobrazení mapy' },
  { keys: 'L', description: 'Zobrazení seznamu' },
  { keys: 'B', description: 'Rozdělené zobrazení' },
  { keys: 'P', description: 'Režim vkládání' },
  { keys: 'Esc', description: 'Zrušit výběr' },
  { keys: 'Ctrl+Z', description: 'Zpět poslední vložení' },
  { keys: 'Ctrl+K', description: 'Globální vyhledávání' },
  { keys: '?', description: 'Zobrazit klávesové zkratky' },
]

interface KeyboardShortcutsProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCtrlK?: () => void
}

export function KeyboardShortcuts({ open, onOpenChange, onCtrlK }: KeyboardShortcutsProps) {
  const setViewMode = useUiStore((s) => s.setViewMode)
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const togglePlaceMode = usePlantStore((s) => s.togglePlaceMode)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (e.altKey || e.shiftKey) return

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') return
        if (e.key === 'k' || e.key === 'K') {
          e.preventDefault()
          onOpenChange?.(false)
          onCtrlK?.()
          return
        }
        return
      }

      switch (e.key) {
        case 'm':
        case 'M':
          e.preventDefault()
          setViewMode('map')
          break
        case 'l':
        case 'L':
          e.preventDefault()
          setViewMode('list')
          break
        case 'b':
        case 'B':
          e.preventDefault()
          setViewMode('both')
          break
        case 'p':
        case 'P':
          e.preventDefault()
          togglePlaceMode()
          break
        case 'Escape':
          setSelectedRecordNumber(null)
          break
        case '?':
          onOpenChange?.(true)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setViewMode, setSelectedRecordNumber, togglePlaceMode, onCtrlK, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Klávesové zkratky</DialogTitle>
          <DialogDescription>Používejte klávesové zkratky pro rychlejší práci</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex items-center justify-between py-1.5 border-b last:border-0">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <kbd className="inline-flex items-center rounded border bg-muted px-2 py-0.5 text-xs font-mono">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
