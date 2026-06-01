'use client'

import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useQuery } from '@tanstack/react-query'
import { TreePine, Map, List, Columns2, Moon, Sun, LogOut, Upload, Database, Search, Printer, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useUiStore } from '@/store/useUiStore'
import { MaintenanceBell } from '@/components/MaintenanceBell'
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts'
import { StatisticsPanel } from '@/components/StatisticsPanel'
import { SpeciesDetailPanel } from '@/components/SpeciesDetailPanel'
import { ActivityLog } from '@/components/ActivityLog'
import { ImportDialog } from '@/components/ImportDialog'
import { BackupRestore } from '@/components/BackupRestore'
import { GlobalSearch } from '@/components/GlobalSearch'
import { UserProfileDialog } from '@/components/UserProfileDialog'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { czechPlural } from '@/lib/czech-plural'
import type { ViewMode } from '@/lib/types'

const viewModes: { mode: ViewMode; icon: typeof Map; label: string; shortcut: string }[] = [
  { mode: 'map', icon: Map, label: 'Mapa', shortcut: 'M' },
  { mode: 'list', icon: List, label: 'Seznam', shortcut: 'L' },
  { mode: 'both', icon: Columns2, label: 'Mapa + Seznam', shortcut: 'B' },
]

export function AppShell() {
  const viewMode = useUiStore((s) => s.viewMode)
  const setViewMode = useUiStore((s) => s.setViewMode)
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [importOpen, setImportOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const { data: countData } = useQuery({
    queryKey: ['records-count'],
    queryFn: async () => {
      const res = await fetch('/api/records?limit=1')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      return data.count as number
    },
    staleTime: 30_000,
  })

  const handlePrint = useCallback(async () => {
    // Fetch all records for printing
    const res = await fetch('/api/records?limit=5000&sort=recordNumber&order=asc')
    if (!res.ok) return
    const data = await res.json()
    const records = data.records ?? []
    const count = data.count ?? 0

    const printHtml = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>Evidence výsadby stromů — Tisk</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #1a1a1a; padding: 15mm; background: white; }
    h1 { font-size: 18px; font-weight: 700; color: #15803d; margin-bottom: 2px; }
    .subtitle { font-size: 11px; color: #666; margin-bottom: 12px; }
    .summary { display: flex; gap: 24px; margin-bottom: 12px; padding: 8px 12px; background: #f0fdf4; border-radius: 4px; border: 1px solid #bbf7d0; }
    .summary-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-value { font-size: 14px; font-weight: 700; color: #15803d; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f5f5f5; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.03em; color: #555; padding: 5px 6px; border-bottom: 2px solid #ddd; text-align: left; }
    td { padding: 4px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    .species-cell { font-style: italic; }
    .footer { margin-top: 16px; padding-top: 6px; border-top: 1px solid #ddd; font-size: 8px; color: #999; display: flex; justify-content: space-between; }
    @media print { body { padding: 10mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>🌳 Evidence výsadby stromů</h1>
  <p class="subtitle">Vytištěno ${new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  <div class="summary">
    <div><span class="summary-label">Celkem záznamů</span><br><span class="summary-value">${count}</span></div>
    <div><span class="summary-label">Zobrazeno</span><br><span class="summary-value">${records.length}</span></div>
  </div>
  <table>
    <thead><tr><th>Číslo</th><th>Druh</th><th>Datum výsadby</th><th>Lokalita</th><th>Zem. šířka</th><th>Zem. délka</th><th>Poznámka</th></tr></thead>
    <tbody>
    ${records.map((r: Record<string, unknown>) => `<tr><td>#${r.recordNumber}</td><td class="species-cell">${r.speciesLatin}</td><td>${new Date(r.plantedAt as string).toLocaleDateString('cs-CZ')}</td><td>${r.locality ?? '—'}</td><td>${(r.lat as number).toFixed(6)}</td><td>${(r.lng as number).toFixed(6)}</td><td>${r.note ?? '—'}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="footer"><span>Evidence výsadby stromů</span><span>Celkem ${count} záznamů</span></div>
  <div class="no-print" style="margin-top:16px;text-align:center;">
    <button onclick="window.print()" style="padding:6px 20px;font-size:12px;cursor:pointer;border:1px solid #ccc;border-radius:4px;background:#15803d;color:white;">🖨️ Tisk</button>
    <button onclick="window.close()" style="padding:6px 20px;font-size:12px;cursor:pointer;border:1px solid #ccc;border-radius:4px;margin-left:6px;">Zavřít</button>
  </div>
</body>
</html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.write(printHtml)
      printWindow.document.close()
    }
  }, [])

  return (
    <div className="h-11 border-b flex items-center px-2.5 gap-1.5 shrink-0 flex-wrap overflow-hidden z-20 bg-gradient-to-r from-green-50/80 via-background to-green-50/40 dark:from-green-950/20 dark:via-background dark:to-green-950/10 backdrop-blur-md shadow-sm gradient-border-animated">
      {/* Logo icon + app name */}
      <div className="flex items-center gap-2 mr-1 shrink-0">
        <div className="size-7 rounded-lg logo-shimmer flex items-center justify-center shadow-sm">
          <TreePine className="size-4 text-white shrink-0" />
        </div>
        <div className="hidden md:flex flex-col leading-none">
          <span className="text-xs font-bold text-foreground/90 tracking-tight">Evidence stromů</span>
          <span className="text-[9px] text-muted-foreground font-normal">Systém evidence výsadby</span>
        </div>
      </div>

      <div className="w-px h-5 bg-border/60 mx-1" />

      {/* View mode toggle */}
      <div className="flex items-center gap-0.5 bg-muted/40 rounded-md p-0.5">
        {viewModes.map(({ mode, icon: Icon, label, shortcut }) => (
          <Tooltip key={mode} delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="icon"
                className={cn(
                  'size-7 transition-all duration-200 hover:scale-105 active:scale-95',
                  viewMode === mode
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm view-mode-active'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent hover:border-green-300/50 dark:hover:border-green-700/50'
                )}
                onClick={() => setViewMode(mode)}
              >
                <Icon className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs tooltip-bounce">
              {label} <kbd className="ml-1 px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">{shortcut}</kbd>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {countData !== undefined && (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold ml-1 px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 tabular-nums count-badge-pulse badge-glow">
          <span className="size-2 rounded-full bg-green-500 animate-pulse" />
          {czechPlural(countData, ['strom', 'stromy', 'stromů'])}
        </span>
      )}

      <div className="flex-1" />

      {/* Global search */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setSearchOpen(true)}>
            <Search className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Vyhledávání <kbd className="ml-1 px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">Ctrl+K</kbd>
        </TooltipContent>
      </Tooltip>

      {/* Maintenance bell */}
      <MaintenanceBell />

      {/* Statistics panel */}
      <StatisticsPanel />

      {/* Species detail panel */}
      <SpeciesDetailPanel />

      {/* Print */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7" onClick={handlePrint}>
            <Printer className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Tisk záznamů</TooltipContent>
      </Tooltip>

      {/* Import CSV */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setImportOpen(true)}>
            <Upload className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Importovat CSV</TooltipContent>
      </Tooltip>

      {/* Activity log */}
      <ActivityLog />

      {/* Backup & Restore */}
      <BackupRestore />

      {/* Keyboard shortcuts */}
      <KeyboardShortcuts onCtrlK={() => setSearchOpen(true)} />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-1.5">
            <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
              {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:block max-w-[100px] truncate">
              {user?.name || user?.email?.split('@')[0]}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
            {user?.email}
          </div>
          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            <User className="size-3.5 mr-2" />
            Profil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="size-3.5 mr-2" /> : <Moon className="size-3.5 mr-2" />}
            {theme === 'dark' ? 'Světlý režim' : 'Tmavý režim'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => logout()}>
            <LogOut className="size-3.5 mr-2" />
            Odhlásit se
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Import dialog */}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Global search dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* User profile dialog */}
      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  )
}
