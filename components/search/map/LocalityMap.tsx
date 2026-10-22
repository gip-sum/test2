'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type * as MapLibre from 'maplibre-gl'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { Button, buttonClassName } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { MapPinIcon } from '@/components/ui/icons'
import { MAP_STYLE_URL, MAPLIBRE_BASE } from '@/lib/map/config'
import { buildSearchUrl, withFilterChange, type SearchQuery } from '@/lib/search/query'

/** One placed area, as the map needs it. Built by the server (SearchMap). */
export type MapMarker = {
  slug: string
  name: string
  lat: number
  lng: number
  count: number
  minPrice: number
  maxPrice: number
  members: string[]
  /** The marker's accessible name, with the price in the product's own format. */
  label: string
  /** How many of this page's cards are in the area (the list beside the map). */
  onPage: number
}

type Status = 'loading' | 'ready' | 'failed'

/** The Kolkata area the posting form accepts: the map never pans far outside it. */
const MAX_BOUNDS: [[number, number], [number, number]] = [[87.8, 21.8], [89, 23.3]]
/** Past this the map shows streets, which says nothing more about an area-level point. */
const MAX_ZOOM = 14
/** A style that has not loaded by now is treated as failed: the list carries on. */
const LOAD_TIMEOUT_MS = 15_000
/** From here the results sit beside the map and the preview is drawn over its top-left corner. */
const BESIDE_LIST = '(min-width: 1024px)'
/** The preview's corner beside the list: 22rem, or 45% of a narrow map (matches .map-preview). */
const previewReserve = (width: number) => Math.min(352, Math.round(width * 0.45)) + 24

/**
 * The map on Search (UI-21): one marker per area, a preview of the chosen
 * one, and the link between markers and the cards beside them.
 *
 * MapLibre is imported from its served ES modules (lib/map/config.ts) only
 * when this mounts, so no other page, and no list view, loads it. Markers
 * are real buttons in the page: named, focusable, pressed when chosen.
 * Choosing is never hover-only: a press selects, and a card that is
 * focused or hovered marks its area's marker.
 *
 * Every failure (no WebGL2, the code or the style not loading) becomes one
 * calm notice in the map's place; the list, and the area index below the
 * map, keep working. Nothing here filters anything: "Show these homes" is
 * a link to the search with that area's localities, built like every
 * other filter link on the page.
 */
export function LocalityMap({ markers, query }: { markers: MapMarker[]; query: SearchQuery }) {
  const container = useRef<HTMLDivElement>(null)
  const elements = useRef(new Map<string, HTMLButtonElement>())
  const heading = useRef<HTMLHeadingElement>(null)
  const focusPreview = useRef(false)
  const mapRef = useRef<MapLibre.Map | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [selected, setSelected] = useState<string | null>(null)
  const [linked, setLinked] = useState<string | null>(null)
  const key = markers.map((m) => `${m.slug}:${m.count}`).join('|')

  // A new set of markers (a filter changed) starts with nothing chosen.
  const [shownKey, setShownKey] = useState(key)
  if (shownKey !== key) { setShownKey(key); setSelected(null) }

  useEffect(() => {
    const el = container.current
    if (!el) return
    let map: MapLibre.Map | undefined
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const fail = () => { if (!cancelled) setStatus('failed') }
    setStatus('loading')

    void (async () => {
      try {
        // MapLibre 6 needs WebGL2; without it the constructor throws later
        // and less clearly, so ask first.
        if (!document.createElement('canvas').getContext('webgl2')) return fail()
        const ml = (await import(/* webpackIgnore: true */ `${MAPLIBRE_BASE}/maplibre-gl.mjs`)) as typeof MapLibre
        if (cancelled) return
        const bounds = new ml.LngLatBounds()
        for (const m of markers) bounds.extend([m.lng, m.lat])
        const beside = matchMedia(BESIDE_LIST).matches
        map = new ml.Map({
          container: el,
          style: MAP_STYLE_URL,
          bounds,
          // Beside the list, the first view leaves the preview's corner
          // clear, so opening one covers no marker until the map is moved.
          fitBoundsOptions: { padding: beside ? { top: 56, bottom: 56, right: 72, left: previewReserve(el.clientWidth) } : 48, maxZoom: 13 },
          maxBounds: MAX_BOUNDS,
          maxZoom: MAX_ZOOM,
          // Turning and tilting add nothing to a map of area points and make
          // a two-finger pan on a phone easy to get wrong.
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          attributionControl: false,
        })
        mapRef.current = map
        map.touchZoomRotate.disableRotation()
        map.keyboard.disableRotation()
        // The basemap's credit is never collapsed behind a button, and never
        // under the preview: bottom-right beside the list (the preview is
        // top-left), top-left on a phone (the preview is a card at the
        // bottom of the screen). The area positions' credit is under the map.
        map.addControl(new ml.AttributionControl({ compact: false }), beside ? 'bottom-right' : 'top-left')
        map.addControl(new ml.NavigationControl({ showCompass: false }), beside ? 'top-right' : 'bottom-right')
        map.getCanvas().setAttribute('aria-label', 'Map of the areas in these results. Arrow keys pan, plus and minus zoom.')

        // Alphabetical, so a keyboard moves through the markers in an order
        // a person can predict.
        for (const m of [...markers].sort((a, b) => a.name.localeCompare(b.name))) {
          const button = document.createElement('button')
          button.type = 'button'
          button.className = 'map-marker'
          button.dataset.area = m.slug
          button.setAttribute('aria-label', m.label)
          button.setAttribute('aria-pressed', 'false')
          const count = document.createElement('span')
          count.className = 'map-marker-count tabular'
          count.textContent = String(m.count)
          const name = document.createElement('span')
          name.className = 'map-marker-name'
          name.textContent = m.name
          button.append(count, name)
          button.addEventListener('click', (event) => {
            // A key press (detail 0) moves on into the preview; a pointer
            // press stays on the map.
            focusPreview.current = event.detail === 0
            // MapLibre cancels the pointer press on the map (it starts a
            // drag), so the marker would never take focus the way a button
            // does; without it the pressed state was unreachable and Escape
            // went to <body>.
            if (event.detail !== 0) button.focus({ preventScroll: true })
            setSelected((s) => (s === m.slug ? null : m.slug))
          })
          elements.current.set(m.slug, button)
          new ml.Marker({ element: button, anchor: 'center' }).setLngLat([m.lng, m.lat]).addTo(map)
        }

        let loaded = false
        timer = setTimeout(fail, LOAD_TIMEOUT_MS)
        map.once('load', () => { loaded = true; clearTimeout(timer); if (!cancelled) setStatus('ready') })
        // Before the first load, an error is the style or its sources
        // failing: there is no map to show. After it, a missing tile leaves
        // a gap in the basemap, and the markers stay right.
        map.on('error', () => { if (!loaded) { clearTimeout(timer); fail() } })
      } catch {
        fail()
      }
    })()

    const known = elements.current
    return () => {
      cancelled = true
      clearTimeout(timer)
      known.clear()
      mapRef.current = null
      map?.remove()
    }
    // Rebuilt when the set of areas changes, never for a selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // The markers live outside React: mirror the chosen and the linked area
  // onto them. Pressed is the state; the class draws it (shape and label,
  // not colour alone).
  useEffect(() => {
    for (const [slug, el] of elements.current) {
      el.setAttribute('aria-pressed', String(slug === selected))
      el.classList.toggle('is-selected', slug === selected)
      el.classList.toggle('is-linked', slug === linked && slug !== selected)
    }
  }, [selected, linked, status])

  useEffect(() => {
    if (selected && focusPreview.current) heading.current?.focus()
    focusPreview.current = false
    // Beside the list, a chosen marker under the preview's corner is moved
    // out from under it, so the area and its preview are both in view.
    const map = mapRef.current, area = markers.find((m) => m.slug === selected)
    if (!map || !area || !matchMedia(BESIDE_LIST).matches) return
    const reserve = previewReserve(map.getContainer().clientWidth), point = map.project([area.lng, area.lat])
    if (point.x < reserve + 24) map.panBy([point.x - reserve - 48, 0])
    // Only a new selection moves the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  // A card focused or under the pointer marks its area on the map — by
  // focus as well as hover, so a keyboard gets the same link.
  useEffect(() => {
    const list = document.getElementById('search-results')
    if (!list) return
    const areaOf = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>('[data-area]')?.dataset.area ?? null : null)
    const enter = (event: Event) => setLinked(areaOf(event.target))
    const leave = (event: Event) => { if (!areaOf((event as FocusEvent | PointerEvent).relatedTarget)) setLinked(null) }
    list.addEventListener('focusin', enter)
    list.addEventListener('pointerover', enter)
    list.addEventListener('focusout', leave)
    list.addEventListener('pointerout', leave)
    return () => {
      list.removeEventListener('focusin', enter)
      list.removeEventListener('pointerover', enter)
      list.removeEventListener('focusout', leave)
      list.removeEventListener('pointerout', leave)
    }
  }, [])

  const close = () => {
    const back = selected ? elements.current.get(selected) : null
    setSelected(null)
    back?.focus()
  }
  // Escape closes an open preview wherever focus is, unless something else
  // (the Filters sheet, say) has already handled the key.
  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || (event.target instanceof Element && event.target.closest('[role="dialog"]'))) return
      const back = elements.current.get(selected)
      setSelected(null)
      back?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selected])
  const area = markers.find((m) => m.slug === selected)
  const homes = (n: number) => `${n.toLocaleString('en-IN')} ${n === 1 ? 'home' : 'homes'}`
  const only = area && withFilterChange(query, { localities: area.members })

  return (
    <div className="map-view">
      {/* The chosen area's cards in the list, drawn by a rule rather than
          by touching the server-rendered cards. Slugs are [a-z0-9-]. */}
      <link rel="stylesheet" href={`${MAPLIBRE_BASE}/maplibre-gl.css`} precedence="default" />
      {area && /^[a-z0-9-]+$/.test(area.slug) && <style>{`.search-split [data-area="${area.slug}"] .result-card{outline:var(--map-chosen-outline);outline-offset:var(--map-chosen-offset)}`}</style>}
      <div className="map-frame" data-status={status}>
      <div ref={container} className="map-canvas" />

      {status === 'loading' && <p className="map-status" role="status">Loading the map…</p>}
      {status === 'failed' && (
        <div className="map-failed">
          <ErrorState
            surface="card"
            title="The map could not load"
            action={<Link href={buildSearchUrl({ ...query, view: undefined })} scroll={false} className={buttonClassName({ variant: 'secondary', className: 'rounded-full' })}>Show the list</Link>}
          >
            Every home is still in the list, and every area is listed below.
          </ErrorState>
        </div>
      )}
      </div>

      <p className="sr-only" aria-live="polite">{area ? `${area.name} selected: ${homes(area.count)}.` : ''}</p>
      {area && only && status === 'ready' && (
        <section aria-labelledby="map-preview-title" className="map-preview">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-caption font-semibold text-ink-700"><MapPinIcon className="size-4 shrink-0" />Approximate area</p>
              <h3 ref={heading} id="map-preview-title" tabIndex={-1} className="mt-0.5 font-display text-heading-3 text-ink-900 outline-none">{area.name}</h3>
            </div>
            <Button variant="tertiary" className="-mr-2 -mt-1 size-11 shrink-0 px-0 text-ink-700" aria-label={`Close ${area.name}`} onClick={close}>
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
            </Button>
          </div>
          <p className="mt-2 text-body-sm text-ink-900"><span className="font-semibold tabular">{homes(area.count)}</span> match this search{area.onPage > 0 && <span className="text-ink-700 max-lg:hidden"> · {area.onPage} on this page, outlined</span>}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 text-ink-700">
            <PriceDisplay amount={area.minPrice} intent={query.intent} />
            {area.maxPrice !== area.minPrice && <><span aria-hidden>–</span><span className="sr-only">to</span><PriceDisplay amount={area.maxPrice} intent={query.intent} /></>}
          </div>
          <p className="mt-2 text-caption text-ink-500">Homes are placed at their locality, never their address.</p>
          {/* On a phone the list is the other mode, so the way on is the
              list; beside the list, it narrows the list and keeps the map. */}
          <Link href={buildSearchUrl({ ...only, view: undefined })} className={buttonClassName({ variant: 'primary', fullWidth: true, className: 'mt-3 rounded-full lg:hidden' })}>Show these {homes(area.count)}</Link>
          {only.localities.join() !== [...query.localities].sort().join() && <Link href={buildSearchUrl(only)} scroll={false} className={buttonClassName({ variant: 'primary', fullWidth: true, className: 'mt-3 rounded-full max-lg:hidden' })}>Show only these {homes(area.count)}</Link>}
        </section>
      )}
    </div>
  )
}
