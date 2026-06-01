'use client'

import { useSession, signOut } from 'next-auth/react'
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
import { useTheme } from 'next-themes'
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

  return (
    <div className="h-10 border-b bg-background/95 backdrop-blur-sm flex items-center px-2 gap-1 shrink-0">
      {/* Logo icon only */}
      <TreePine className="size-5 text-green-600 shrink-0 mx-1" />

      <div className="w-px h-5 bg-border mx-1" />

      {/* View mode toggle */}
      <div className="flex items-center gap-0.5">
        {viewModes.map(({ mode, icon: Icon, label }) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === mode ? 'secondary' : 'ghost'}
                size="icon"
                className="size-7"
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

      <div className="flex-1" />

      {/* Maintenance bell */}
      <MaintenanceBell />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7">
            <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
              {session?.user?.name?.[0]?.toUpperCase() ?? session?.user?.email?.[0]?.toUpperCase() ?? '?'}
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
