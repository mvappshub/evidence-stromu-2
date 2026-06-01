'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { TreePine, Map, List, Columns2, Moon, Sun, LogOut, Upload } from 'lucide-react'
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
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [importOpen, setImportOpen] = useState(false)

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

      {/* Maintenance bell */}
      <MaintenanceBell />

      {/* Statistics panel */}
      <StatisticsPanel />

      {/* Species detail panel */}
      <SpeciesDetailPanel />

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

      {/* Keyboard shortcuts */}
      <KeyboardShortcuts />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-1.5">
            <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
              {session?.user?.name?.[0]?.toUpperCase() ?? session?.user?.email?.[0]?.toUpperCase() ?? '?'}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:block max-w-[100px] truncate">
              {session?.user?.name || session?.user?.email?.split('@')[0]}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
            {session?.user?.email}
          </div>
          <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="size-3.5 mr-2" /> : <Moon className="size-3.5 mr-2" />}
            {theme === 'dark' ? 'Světlý režim' : 'Tmavý režim'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
            <LogOut className="size-3.5 mr-2" />
            Odhlásit se
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Import dialog */}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
