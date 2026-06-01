'use client'

import { useState, useEffect } from 'react'
import { Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

export function KeyboardShortcuts({ onCtrlK }: { onCtrlK?: () => void }) {
  const [helpOpen, setHelpOpen] = useState(false)
  const setViewMode = useUiStore((s) => s.setViewMode)
  const setSelectedRecordNumber = useUiStore((s) => s.setSelectedRecordNumber)
  const togglePlaceMode = usePlantStore((s) => s.togglePlaceMode)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in input/textarea
      const tag = (document.activeElement?.tagName ?? '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      // Skip if modifier keys are pressed (except Ctrl+Z)
      if (e.altKey || e.shiftKey) return

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          // Undo - handled by MapView, don't duplicate
          return
        }
        if (e.key === 'k' || e.key === 'K') {
          e.preventDefault()
          setHelpOpen(false) // close help if open
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
          setHelpOpen(true)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setViewMode, setSelectedRecordNumber, togglePlaceMode, onCtrlK])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => setHelpOpen(true)}
        title="Klávesové zkratky"
      >
        <Keyboard className="size-3.5" />
      </Button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Klávesové zkratky</DialogTitle>
            <DialogDescription>
              Používejte klávesové zkratky pro rychlejší práci
            </DialogDescription>
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
    </>
  )
}
