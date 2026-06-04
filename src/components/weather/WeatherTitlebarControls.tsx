'use client'

import { AlertTriangle, ExternalLink } from 'lucide-react'
import { CHMI_ALERTS_INFO_URL } from '@/lib/chmi-cap-config'
import { useWeatherAlerts } from '@/hooks/useWeatherAlerts'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

function formatEventList(events: string[]): string {
  const unique = [...new Set(events)]
  if (unique.length <= 2) return unique.join(', ')
  return `${unique.slice(0, 2).join(', ')} (+${unique.length - 2})`
}

function CapAlertsPopoverBody() {
  const { data, isLoading } = useWeatherAlerts()

  if (isLoading) {
    return <p className="text-[11px] text-muted-foreground">Načítám výstrahy…</p>
  }

  const isActive = data?.active && (data.affectedTreeCount ?? 0) > 0

  if (isActive && data) {
    const relevantAlerts = data.alerts.filter((a) => a.treeCount > 0)
    const events =
      relevantAlerts.length > 0
        ? relevantAlerts.map((a) => a.event)
        : data.alerts.map((a) => a.event)

    const treeLabel =
      data.affectedTreeCount === 1
        ? '1 strom'
        : data.affectedTreeCount < 5
          ? `${data.affectedTreeCount} stromy`
          : `${data.affectedTreeCount} stromů`

    const orpLabel =
      data.affectedOrpCount === 1 ? '1 ORP' : `${data.affectedOrpCount} ORP`

    return (
      <div className="space-y-2">
        <div
          className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] leading-snug text-amber-950 dark:text-amber-100"
          role="status"
        >
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="size-3 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              <span className="font-medium">ČHMÚ:</span> {formatEventList(events)} — {treeLabel}{' '}
              v {orpLabel}
            </span>
          </div>
          {data.recordsWithoutOrp > 0 ? (
            <p className="mt-1 pl-5 text-[10px] text-amber-800/90 dark:text-amber-200/80">
              {data.recordsWithoutOrp}{' '}
              {data.recordsWithoutOrp === 1 ? 'záznam nemá' : 'záznamů nemá'} přiřazené ORP.
            </p>
          ) : null}
        </div>
        <a
          href={CHMI_ALERTS_INFO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-[10px] underline underline-offset-2"
        >
          Detail na chmi.cz
          <ExternalLink className="size-2.5" />
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground leading-snug">
        Aktuálně žádná výstraha ČHMÚ pro vaše stromy (podle ORP a aktivních jevů).
      </p>
      <a
        href={CHMI_ALERTS_INFO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-0.5 text-[10px] underline underline-offset-2"
      >
        Výstrahy na chmi.cz
        <ExternalLink className="size-2.5" />
      </a>
    </div>
  )
}

function CapAlertsTitlebarControl() {
  const { data, isLoading } = useWeatherAlerts()
  const isActive = !isLoading && data?.active && (data.affectedTreeCount ?? 0) > 0

  const shortLabel =
    isActive && data
      ? (() => {
          const ev = data.alerts.find((a) => a.treeCount > 0)?.event ?? data.alerts[0]?.event
          if (!ev) return 'Výstraha'
          return ev.length > 18 ? `${ev.slice(0, 16)}…` : ev
        })()
      : null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-[22px] gap-1 px-1.5 font-mono text-[10px] shrink-0',
            isActive &&
              'bg-amber-500/15 text-amber-900 hover:bg-amber-500/25 dark:text-amber-100'
          )}
          title="Výstrahy ČHMÚ"
        >
          <AlertTriangle
            className={cn(
              'size-3 shrink-0',
              isActive ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
            )}
          />
          <span className="hidden sm:inline truncate max-w-[100px]">
            {shortLabel ?? 'Výstrahy'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-sm p-2 text-[11px]">
        <CapAlertsPopoverBody />
      </PopoverContent>
    </Popover>
  )
}

export function WeatherTitlebarControls() {
  return (
    <>
      <div className="w-px h-3.5 bg-border mx-0.5 shrink-0" />
      <CapAlertsTitlebarControl />
    </>
  )
}
