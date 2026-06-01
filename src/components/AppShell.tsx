'use client'

import { useSession, signOut } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { TreePine, Map, List, Columns2, Moon, Sun, LogOut } from 'lucide-react'
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
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { czechPlural } from '@/lib/czech-plural'
import type { ViewMode } from '@/lib/types'

const viewModes: { mode: ViewMode; icon: typeof Map; label: string }[] = [
  { mode: 'map', icon: Map, label: 'Mapa' },
  { mode: 'list', icon: List, label: 'Seznam' },
  { mode: 'both', icon: Columns2, label: 'Mapa + Seznam' },
]

export function AppShell() {
  const viewMode = useUiStore((s) => s.viewMode)
  const setViewMode = useUiStore((s) => s.setViewMode)
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()

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
    <div className="h-10 border-b glass-bar flex items-center px-2 gap-1 shrink-0 flex-wrap overflow-hidden z-20">
      {/* Logo icon only */}
      <TreePine className="size-5 text-green-600 shrink-0 mx-1" />

      <div className="w-px h-5 bg-border/60 mx-1" />

      {/* View mode toggle */}
      <div className="flex items-center gap-0.5">
        {viewModes.map(({ mode, icon: Icon, label }) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="icon"
                className={cn(
                  'size-7 transition-colors',
                  viewMode === mode && 'bg-green-600 hover:bg-green-700 text-white'
                )}
                onClick={() => setViewMode(mode)}
              >
                <Icon className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {countData !== undefined && (
        <span className="text-[10px] text-muted-foreground ml-1 tabular-nums">
          {czechPlural(countData, ['strom', 'stromy', 'stromů'])}
        </span>
      )}

      <div className="flex-1" />

      {/* Maintenance bell */}
      <MaintenanceBell />

      {/* Statistics panel */}
      <StatisticsPanel />

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
    </div>
  )
}
