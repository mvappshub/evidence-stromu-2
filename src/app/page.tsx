'use client'

import { AuthGate } from '@/components/AuthGate'
import { AppShell } from '@/components/AppShell'
import { MapView } from '@/components/map/MapView'
import { PlantContextBar } from '@/components/map/PlantContextBar'
import { RecordsTable } from '@/components/table/RecordsTable'
import { StatusBar } from '@/components/StatusBar'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from 'next-themes'
import { useUiStore } from '@/store/useUiStore'
import { useIsMobile } from '@/hooks/use-mobile'
import { MapProvider } from '@/components/map/MapContext'
import { BackupRestoreProvider } from '@/components/BackupRestore'

function WorkArea() {
  const viewMode = useUiStore((s) => s.viewMode)
  const isMobile = useIsMobile()

  // On mobile, use vertical split for "both" mode
  if (viewMode === 'map') {
    return (
      <div className="flex-1 min-h-0">
        <div className="relative w-full h-full">
          <MapView />
          <PlantContextBar />
        </div>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className="flex-1 min-h-0">
        <RecordsTable />
      </div>
    )
  }

  // Both view
  return (
    <div className="flex-1 min-h-0">
      <ResizablePanelGroup
        direction={isMobile ? 'vertical' : 'horizontal'}
        className="w-full h-full"
      >
        <ResizablePanel defaultSize={55} minSize={30}>
          <div className="relative w-full h-full">
            <MapView />
            <PlantContextBar />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={45} minSize={25}>
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
        <StatusBar />
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
