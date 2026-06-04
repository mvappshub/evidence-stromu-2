'use client'

import { useEffect, useRef } from 'react'
import type { ImperativePanelHandle } from 'react-resizable-panels'
import { AuthGate } from '@/components/AuthGate'
import { AppShell } from '@/components/AppShell'
import { MapView } from '@/components/map/MapView'
import { PlantContextBar } from '@/components/map/PlantContextBar'
import { RecordsTable } from '@/components/table/RecordsTable'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from 'next-themes'
import { useUiStore } from '@/store/useUiStore'
import type { ViewMode } from '@/lib/types'
import { useIsMobile } from '@/hooks/use-mobile'
import { MapProvider } from '@/components/map/MapContext'
import { BackupRestoreProvider } from '@/components/BackupRestore'

function MapPanel() {
  return (
    <div className="relative w-full h-full min-h-0">
      <MapView />
      <PlantContextBar />
    </div>
  )
}

function applyViewModeLayout(
  viewMode: ViewMode,
  mapPanel: ImperativePanelHandle | null,
  listPanel: ImperativePanelHandle | null
) {
  if (viewMode === 'map') {
    mapPanel?.resize(100)
    listPanel?.resize(0)
    return
  }
  if (viewMode === 'list') {
    mapPanel?.resize(0)
    listPanel?.resize(100)
    return
  }
  mapPanel?.resize(55)
  listPanel?.resize(45)
}

function WorkArea() {
  const viewMode = useUiStore((s) => s.viewMode)
  const isMobile = useIsMobile()
  const mapPanelRef = useRef<ImperativePanelHandle>(null)
  const listPanelRef = useRef<ImperativePanelHandle>(null)

  useEffect(() => {
    applyViewModeLayout(viewMode, mapPanelRef.current, listPanelRef.current)
  }, [viewMode])

  const showHandle = viewMode === 'both'

  return (
    <div className="flex-1 min-h-0">
      <ResizablePanelGroup
        direction={isMobile ? 'vertical' : 'horizontal'}
        className="w-full h-full"
      >
        <ResizablePanel
          ref={mapPanelRef}
          id="map-panel"
          order={1}
          defaultSize={55}
          minSize={0}
          collapsible
          className={viewMode === 'list' ? 'hidden' : undefined}
        >
          <MapPanel />
        </ResizablePanel>
        {showHandle ? <ResizableHandle withHandle /> : null}
        <ResizablePanel
          ref={listPanelRef}
          id="list-panel"
          order={2}
          defaultSize={45}
          minSize={0}
          collapsible
          className={viewMode === 'map' ? 'hidden' : undefined}
        >
          <div className="flex flex-col h-full min-h-0 border-l">
            <RecordsTable />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

function AppContent() {
  return (
    <MapProvider>
      <div className="h-screen flex flex-col bg-background">
        <AppShell />
        <WorkArea />
      </div>
    </MapProvider>
  )
}

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthGate>
        <BackupRestoreProvider>
          <TooltipProvider delayDuration={300}>
            <AppContent />
          </TooltipProvider>
        </BackupRestoreProvider>
      </AuthGate>
    </ThemeProvider>
  )
}
