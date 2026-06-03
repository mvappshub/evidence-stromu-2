'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Loader2, MapPin, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { searchPlaces, type PhotonPlace } from '@/lib/photon-geocode'
import { useMapContext } from '@/components/map/MapContext'

export function MapPlaceSearch() {
  const { map } = useMapContext()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PhotonPlace[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  const flyToPlace = useCallback(
    (place: PhotonPlace) => {
      if (!map) return
      map.flyTo({
        center: [place.lng, place.lat],
        zoom: Math.max(map.getZoom(), place.zoom),
        duration: 1200,
      })
      setQuery(place.label)
      setIsOpen(false)
      setActiveIndex(-1)
      inputRef.current?.blur()
    },
    [map]
  )

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      setError(null)
      searchPlaces(q, controller.signal)
        .then((places) => {
          setResults(places)
          setActiveIndex(places.length > 0 ? 0 : -1)
          setIsOpen(true)
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          setResults([])
          setError(err instanceof Error ? err.message : 'Vyhledávání selhalo')
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false)
        })
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setError(null)
    setIsOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key === 'ArrowDown' && results.length > 0) {
      setIsOpen(true)
      setActiveIndex(0)
      e.preventDefault()
      return
    }
    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      flyToPlace(results[activeIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  const showDropdown = Boolean(
    isOpen && (isLoading || error || results.length > 0 || query.trim().length >= 2)
  )

  return (
    <div ref={rootRef} className="absolute top-1 left-1 z-10 w-[min(100%-5rem,280px)]">
      <div className="relative bg-toolbar border border-border shadow-sm">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            const nextValue = e.target.value
            setQuery(nextValue)
            if (nextValue.trim().length < 2) {
              setResults([])
              setIsOpen(false)
              setError(null)
              setActiveIndex(-1)
              setIsLoading(false)
            }
          }}
          onFocus={() => {
            if (results.length > 0 || query.trim().length >= 2) setIsOpen(true)
          }}
          onKeyDown={onKeyDown}
          placeholder="Hledat místo…"
          className="h-7 text-[11px] pl-7 pr-7 rounded-none border-0 bg-transparent focus-visible:ring-0"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 size-3 animate-spin text-muted-foreground" />
        )}
        {!isLoading && query.length > 0 && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            title="Vymazat"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          className="mt-px max-h-56 overflow-y-auto border border-border bg-popover text-[11px] shadow-md"
        >
          {isLoading && results.length === 0 && (
            <li className="px-2 py-2 text-muted-foreground">Hledám…</li>
          )}
          {error && (
            <li className="px-2 py-2 text-destructive">{error}</li>
          )}
          {!isLoading && !error && results.length === 0 && query.trim().length >= 2 && (
            <li className="px-2 py-2 text-muted-foreground">Žádné výsledky</li>
          )}
          {results.map((place, index) => (
            <li key={place.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={cn(
                  'w-full text-left px-2 py-1.5 flex gap-2 items-start hover:bg-accent',
                  index === activeIndex && 'bg-accent'
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => flyToPlace(place)}
              >
                <MapPin className="size-3 mt-0.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block font-medium truncate">{place.label}</span>
                  {place.subtitle && (
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {place.subtitle}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
          {results.length > 0 && (
            <li className="px-2 py-1 border-t border-border text-[9px] text-muted-foreground">
              © OpenStreetMap · Photon
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
