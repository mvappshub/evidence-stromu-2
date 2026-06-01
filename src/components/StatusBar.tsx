'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Database, Wifi, WifiOff } from 'lucide-react'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'

export function StatusBar() {
  const { data: session } = useSession()
  const { isError } = useQuery({
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
    <div className="h-6 border-t bg-muted/50 flex items-center px-3 gap-4 text-[10px] text-muted-foreground shrink-0">
      <span className="flex items-center gap-1">
        <Database className="size-3" />
        SQLite
      </span>
      {isError ? (
        <span className="flex items-center gap-1 text-destructive">
          <WifiOff className="size-3" />
          Odpojeno
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <Wifi className="size-3" />
          Připojeno
        </span>
      )}
      <div className="flex-1" />
      <span>
        {format(new Date(), 'd. MMMM yyyy, H:mm', { locale: cs })}
      </span>
      {session?.user?.email && (
        <span className="hidden sm:inline">
          {session.user.email}
        </span>
      )}
    </div>
  )
}
