'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Database, WifiOff } from 'lucide-react'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { czechPlural } from '@/lib/czech-plural'

export function StatusBar() {
  const { data: session } = useSession()
  const { data: countData, isError } = useQuery({
    queryKey: ['records-count-status'],
    queryFn: async () => {
      const res = await fetch('/api/records?limit=1')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      return data.count as number
    },
    staleTime: 30_000,
    refetchInterval: 120_000,
  })

  return (
    <div className="h-7 border-t glass-bar flex items-center px-3 gap-3 text-[10px] text-muted-foreground shrink-0 z-20">
      <span className="flex items-center gap-1.5">
        <Database className="size-3" />
        {countData !== undefined ? `${czechPlural(countData, ['strom', 'stromy', 'stromů'])} v databázi` : 'SQLite'}
      </span>
      <div className="status-separator" />
      {isError ? (
        <span className="flex items-center gap-1.5 text-destructive">
          <WifiOff className="size-3" />
          Odpojeno
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-green-500" />
          Připojeno
        </span>
      )}
      <div className="status-separator" />
      <div className="flex-1" />
      <span className="tabular-nums">
        {format(new Date(), 'd. MMMM yyyy, H:mm', { locale: cs })}
      </span>
      {session?.user?.email && (
        <>
          <div className="status-separator" />
          <span className="hidden sm:inline">
            {session.user.email}
          </span>
        </>
      )}
    </div>
  )
}
