import type { LatLng } from '@/lib/geodesic-line-points'

export type LinePlacePhase = 'idle' | 'drawing' | 'preview'

export type LinePlaceSlice = {
  linePlaceVertices: LatLng[]
  linePlacePreview: LatLng[] | null
  linePlacePhase: LinePlacePhase
  linePlacePreviewTruncated: boolean
  resetLinePlace: () => void
  addLinePlaceVertex: (pt: LatLng) => void
  setLinePlacePreview: (points: LatLng[], truncated: boolean) => void
  clearLinePlacePreview: () => void
}

export const initialLinePlaceState = {
  linePlaceVertices: [] as LatLng[],
  linePlacePreview: null as LatLng[] | null,
  linePlacePhase: 'idle' as LinePlacePhase,
  linePlacePreviewTruncated: false,
}

export function createLinePlaceActions(
  set: (
    partial:
      | Partial<LinePlaceSlice & typeof initialLinePlaceState>
      | ((s: LinePlaceSlice & typeof initialLinePlaceState) => Partial<LinePlaceSlice>)
  ) => void
): Pick<
  LinePlaceSlice,
  'resetLinePlace' | 'addLinePlaceVertex' | 'setLinePlacePreview' | 'clearLinePlacePreview'
> {
  return {
    resetLinePlace: () =>
      set({
        ...initialLinePlaceState,
        linePlacePhase: 'idle',
      }),
    addLinePlaceVertex: (pt) =>
      set((state) => ({
        linePlaceVertices: [...state.linePlaceVertices, pt],
        linePlacePreview: null,
        linePlacePreviewTruncated: false,
        linePlacePhase: 'drawing',
      })),
    setLinePlacePreview: (points, truncated) =>
      set({
        linePlacePreview: points,
        linePlacePreviewTruncated: truncated,
        linePlacePhase: 'preview',
      }),
    clearLinePlacePreview: () =>
      set({
        linePlacePreview: null,
        linePlacePreviewTruncated: false,
        linePlacePhase: 'drawing',
      }),
  }
}
