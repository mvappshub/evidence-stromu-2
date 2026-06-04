import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/useAuthStore'

export interface WeatherAlertSummary {
  id: string
  event: string
  severity?: string
  orpCount: number
  treeCount: number
}

export interface WeatherAlertsResponse {
  active: boolean
  error?: string
  alerts: WeatherAlertSummary[]
  affectedTreeCount: number
  affectedOrpCount: number
  recordsWithoutOrp: number
  fetchedAt: string | null
}

const REFETCH_MS = 15 * 60 * 1000

export function useWeatherAlerts() {
  const user = useAuthStore((s) => s.user)

  return useQuery<WeatherAlertsResponse>({
    queryKey: ['weather-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/weather/alerts')
      if (!res.ok) throw new Error('Nepodařilo se načíst výstrahy ČHMÚ')
      return res.json()
    },
    enabled: Boolean(user),
    staleTime: 10 * 60 * 1000,
    refetchInterval: REFETCH_MS,
  })
}
