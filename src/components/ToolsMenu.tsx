'use client'

import { ChevronDown, BarChart3, Flower2, Activity, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ToolsMenuProps {
  onOpenStats: () => void
  onOpenSpecies: () => void
  onOpenActivity: () => void
  onOpenShortcuts: () => void
}

export function ToolsMenu({
  onOpenStats,
  onOpenSpecies,
  onOpenActivity,
  onOpenShortcuts,
}: ToolsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-[22px] gap-0.5 font-mono">
          nástroje
          <ChevronDown className="size-2.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={onOpenStats}>
          <BarChart3 className="size-3.5 mr-2" />
          Statistiky
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenSpecies}>
          <Flower2 className="size-3.5 mr-2" />
          Přehled druhů
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenActivity}>
          <Activity className="size-3.5 mr-2" />
          Log aktivit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenShortcuts}>
          <Keyboard className="size-3.5 mr-2" />
          Klávesové zkratky
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
