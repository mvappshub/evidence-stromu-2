import { toast } from 'sonner'
import {
  interpolatePointsAlongPolylineBounded,
  polylineLengthMeters,
  type LatLng,
} from '@/lib/geodesic-line-points'
import { usePlantStore } from '@/store/usePlantStore'

export function finishLinePlaceDrawing(): boolean {
  const state = usePlantStore.getState()
  const { linePlaceVertices, lineSpacingMeters, activeSpecies, activeDate } = state

  if (linePlaceVertices.length < 2) {
    toast.error('Nakreslete alespoň 2 body čáry')
    return false
  }
  if (!activeSpecies.trim() || !activeDate.trim()) {
    toast.error('Vyplňte druh a datum výsadby v liště pod mapou')
    return false
  }

  const { points, truncated } = interpolatePointsAlongPolylineBounded(
    linePlaceVertices,
    lineSpacingMeters
  )
  if (points.length === 0) {
    toast.error('Čára je příliš krátká')
    return false
  }

  state.setLinePlacePreview(points, truncated)
  if (truncated) {
    toast.warning('Náhled omezen na maximální počet bodů')
  }
  return true
}

export function getLinePlaceSummary(): {
  lineLengthM: number
  previewCount: number
} {
  const { linePlaceVertices, linePlacePreview } = usePlantStore.getState()
  return {
    lineLengthM:
      linePlaceVertices.length >= 2 ? polylineLengthMeters(linePlaceVertices) : 0,
    previewCount: linePlacePreview?.length ?? 0,
  }
}

export function buildLinePlaceRecords(
  preview: LatLng[]
): Array<{
  lat: number
  lng: number
  speciesLatin: string
  plantedAt: string
  locality: string | null
}> {
  const { activeSpecies, activeDate, activeLocality } = usePlantStore.getState()
  const speciesLatin = activeSpecies.trim()
  const plantedAt = activeDate.trim()
  const locality = activeLocality.trim() || null
  return preview.map((pt) => ({
    lat: pt.lat,
    lng: pt.lng,
    speciesLatin,
    plantedAt,
    locality,
  }))
}
