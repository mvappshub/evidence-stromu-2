'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { Map, List, Columns2, Moon, Sun, LogOut, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUiStore } from '@/store/useUiStore'
import { MaintenanceBell } from '@/components/MaintenanceBell'
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts'
import { StatisticsPanel } from '@/components/StatisticsPanel'
import { SpeciesDetailPanel } from '@/components/SpeciesDetailPanel'
import { ActivityLog } from '@/components/ActivityLog'
import { ImportDialog } from '@/components/ImportDialog'
import { GlobalSearch } from '@/components/GlobalSearch'
import { UserProfileDialog } from '@/components/UserProfileDialog'
import { DataMenu } from '@/components/DataMenu'
import { ToolsMenu } from '@/components/ToolsMenu'
import { useTheme } from 'next-themes'
import type { ViewMode } from '@/lib/types'
import { useAuthActions } from '@/hooks/useAuthActions'
import { WeatherTitlebarControls } from '@/components/weather/WeatherTitlebarControls'

const viewModes: { mode: ViewMode; icon: typeof Map; label: string }[] = [
  { mode: 'map', icon: Map, label: 'Mapa' },
  { mode: 'list', icon: List, label: 'Seznam' },
  { mode: 'both', icon: Columns2, label: 'Obojí' },
]

export function AppShell() {
  const viewMode = useUiStore((s) => s.viewMode)
  const setViewMode = useUiStore((s) => s.setViewMode)
  const { user } = useAuthStore()
  const { logoutWithToast } = useAuthActions()
  const { theme, setTheme } = useTheme()
  const [importOpen, setImportOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [speciesOpen, setSpeciesOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  return (
    <>
      <header className="devtools-titlebar flex items-center px-2 gap-1.5 shrink-0 z-20">
        <span className="text-[11px] text-muted-foreground font-mono shrink-0 hidden sm:inline">
          evidence-stromu
        </span>

        <div className="w-px h-3.5 bg-border mx-0.5 shrink-0" />

        <div className="devtools-segment" role="group" aria-label="Režim zobrazení">
          {viewModes.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              data-active={viewMode === mode ? 'true' : 'false'}
              onClick={() => setViewMode(mode)}
              title={label}
            >
              <span className="inline-flex items-center gap-1">
                <Icon className="size-3" />
                <span className="hidden md:inline">{label}</span>
              </span>
            </button>
          ))}
        </div>

        <WeatherTitlebarControls />

        <div className="flex-1 min-w-2" />

        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => setSearchOpen(true)}
          title="Vyhledávání (Ctrl+K)"
        >
          <Search className="size-3.5" />
        </Button>

        <MaintenanceBell />

        <DataMenu onImport={() => setImportOpen(true)} />
        <ToolsMenu
          onOpenStats={() => setStatsOpen(true)}
          onOpenSpecies={() => setSpeciesOpen(true)}
          onOpenActivity={() => setActivityOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-[22px] gap-1 px-1.5 font-mono text-[10px]">
              <User className="size-3" />
              <span className="hidden sm:inline max-w-[72px] truncate opacity-80">
                {user?.name || user?.email?.split('@')[0]}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-sm text-[11px]">
            <div className="px-2 py-1 text-[10px] text-muted-foreground font-mono truncate border-b border-border">
              {user?.email}
            </div>
            <DropdownMenuItem onClick={() => setProfileOpen(true)} className="text-[11px]">
              <User className="size-3 mr-2" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="text-[11px]">
              {theme === 'dark' ? <Sun className="size-3 mr-2" /> : <Moon className="size-3 mr-2" />}
              {theme === 'dark' ? 'Světlý' : 'Tmavý'}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[11px]"
              onClick={() => void logoutWithToast()}
            >
              <LogOut className="size-3 mr-2" />
              Odhlásit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <StatisticsPanel open={statsOpen} onOpenChange={setStatsOpen} />
      <SpeciesDetailPanel open={speciesOpen} onOpenChange={setSpeciesOpen} />
      <ActivityLog open={activityOpen} onOpenChange={setActivityOpen} />
      <KeyboardShortcuts
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        onCtrlK={() => setSearchOpen(true)}
      />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  )
}
