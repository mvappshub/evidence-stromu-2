'use client'

import { AuthGate } from '@/components/AuthGate'
import { AppShell } from '@/components/AppShell'
import { MapView } from '@/components/map/MapView'
import { PlantContextBar } from '@/components/map/PlantContextBar'
import { RecordsTable } from '@/components/table/RecordsTable'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from 'next-themes'
import { useUiStore } from '@/store/useUiStore'

function WorkArea() {
  const viewMode = useUiStore((s) => s.viewMode)

  return (
    <div className="flex-1 min-h-0">
      {viewMode === 'map' && (
        <div className="relative w-full h-full">
          <MapView />
          <PlantContextBar />
        </div>
      )}
      {viewMode === 'list' && (
        <div className="w-full h-full">
          <RecordsTable />
        </div>
      )}
      {viewMode === 'both' && (
        <ResizablePanelGroup direction="horizontal" className="w-full h-full">
          <ResizablePanel defaultSize={55} minSize={30}>
            <div className="relative w-full h-full">
              <MapView />
              <PlantContextBar />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={25}>
            <RecordsTable />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  )
}

function AppContent() {
  return (
    <div className="h-screen flex flex-col">
      <AppShell />
      <WorkArea />
    </div>
  )
}

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthGate>
        <TooltipProvider delayDuration={300}>
          <AppContent />
        </TooltipProvider>
      </AuthGate>
    </ThemeProvider>
  )
}
