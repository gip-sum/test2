'use client'

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FilterControls, type FilterPatch } from '@/components/filters/FilterControls'
import { Chip } from '@/components/ui/Chip'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { ChevronDownIcon, MapPinIcon, SlidersIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import type { Facets } from '@/lib/property/search'
import { IntentSwitch } from './IntentSwitch'
import { clearAllPatch, describeActiveFilters } from '@/lib/search/describe'
import {
  RESULTS_PER_PAGE,
  SORT_LABEL,
  SORT_ORDER,
  buildSearchUrl,
  withFilterChange,
  type SearchQuery,
  type SortKey,
} from '@/lib/search/query'

/**
 * The results frame: the search band, filter rail, toolbar, chips and
 * filter sheet (UI-15 layout).
 *
 * Owns every navigation on this page, and owns no filter state. A control
 * produces a patch, the patch becomes a URL, the server returns new results
 * and new counts. That is the whole loop, and it is why back, forward,
 * refresh and a pasted link need no special handling — they are the same
 * code path as clicking a filter.
 *
 * The result list arrives as `children` from the server component, so the
 * listings themselves never enter the client bundle.
 */
export function SearchLayout({
  query,
  facets,
  total,
  heading,
  cityName,
  localityNames,
  notice,
  map,
  children,
}: {
  query: SearchQuery
  facets: Facets
  total: number
  heading: string
  cityName: string
  /** Plain object, not a Map: this crosses the server/client boundary. */
  localityNames: Record<string, string>
  /** The sample-data notice, rendered by the server (it reads the data seam). */
  notice?: ReactNode
  /** The map view's map and area index (UI-21), rendered by the server. */
  map?: ReactNode
  children: ReactNode
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // A sheet put back after a remount (below) starts open, in place.
  const [restored] = useState(() => (carry && Date.now() - carry.at < CARRY_MS ? carry : null))
  const [sheetOpen, setSheetOpen] = useState(() => restored?.sheet ?? false)
  const rail = useRef<HTMLElement>(null)
  const sheetBody = useRef<HTMLDivElement>(null)
  const filtersButton = useRef<HTMLButtonElement>(null)
  // Entrance animations apply only to what arrives after hydration. Set on
  // the element directly rather than through state: a state change here
  // re-rendered the whole frame, filter rail included, right after
  // hydration (measured: +100ms of blocking time on a 4x-slowed phone).
  // React does not manage the attribute, so later renders leave it alone.
  const frame = useRef<HTMLDivElement>(null)
  useEffect(() => { frame.current?.setAttribute('data-enter', '') }, [])

  // After a filter change: if this frame is new (the change moved the URL to
  // another path and the page remounted), put back the scroll positions and
  // the focus the old frame had; if it is the same frame, nothing was lost.
  // Either way the carry is spent.
  const fresh = useRef(true)
  useEffect(() => {
    const c = fresh.current ? restored : null
    fresh.current = false
    carry = null
    if (!c) return
    if (rail.current) rail.current.scrollTop = c.railScroll
    const scroller = sheetBody.current?.parentElement
    if (scroller) scroller.scrollTop = c.sheetScroll
    if (!c.sheet) findRestored(frame.current, c.focus)?.focus({ preventScroll: true })
  }, [query, restored])

  const names = new Map(Object.entries(localityNames))
  const active = describeActiveFilters(query, names)

  /**
   * Filter changes keep the scroll position: the rail is beside the results
   * on desktop and inside a sheet on mobile, and in both cases jumping to
   * the top of the document after a tick would lose the user's place in a
   * list of nineteen filters.
   */
  const apply = (patch: FilterPatch) => {
    remember()
    startTransition(() => {
      router.push(buildSearchUrl(withFilterChange(query, patch)), { scroll: false })
    })
  }

  const sortTo = (sort: SortKey) => {
    // Sorting is not a filter, so it does not reset the page... except that
    // page 3 of a price-ascending list has nothing to do with page 3 of a
    // newest-first one, so it does.
    remember()
    startTransition(() => {
      router.push(buildSearchUrl({ ...query, sort, page: 1 }), { scroll: false })
    })
  }

  /** What a remount would lose: the open sheet, where each list was scrolled, and focus. */
  function remember() {
    const el = document.activeElement instanceof HTMLElement ? document.activeElement : null
    carry = {
      at: Date.now(),
      sheet: sheetOpen,
      focus: el?.closest<HTMLElement>('[data-restore]')?.dataset.restore ?? (el?.id ? `#${el.id}` : el?.getAttribute('aria-label') ? `@${el.getAttribute('aria-label')}` : null),
      railScroll: rail.current?.scrollTop ?? 0,
      sheetScroll: sheetBody.current?.parentElement?.scrollTop ?? 0,
    }
  }

  const activeCount = active.length
  const clearHref = buildSearchUrl(withFilterChange(query, clearAllPatch()))
  // This search at page 1 without a sort: the no-JavaScript sort form's target.
  const sortBase = new URL(buildSearchUrl({ ...query, sort: 'relevance', page: 1 }), 'http://localhost')

  const perPage = RESULTS_PER_PAGE
  const from = (query.page - 1) * perPage + 1
  const to = Math.min(query.page * perPage, total)
  const shortcuts = query.localities.length
    ? []
    : [...facets.localities.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const mapView = query.view === 'map'
  const place = query.localities.length
    ? query.localities.map((s) => names.get(s) ?? s).join(', ')
    : 'All localities'

  return (
    <div ref={frame}>
      {/* The search band (UI-15): where you are, what you searched and how
          many matched, on the homepage's mint, in the 1400px frame the
          header and footer use. Compact: this is a page for working
          through results, not a second hero. */}
      <header className="search-band">
        <div className="home-container pb-5 pt-3 lg:pb-8 lg:pt-5">
          {notice}
          <div className="mt-4 flex items-center justify-between gap-3 lg:mt-6">
            <p className="flex min-w-0 items-center gap-2 text-overline uppercase text-brand-600">
              <span aria-hidden className="h-0.5 w-6 shrink-0 rounded-full bg-brand-500" />
              <span className="truncate">{cityName} · {place}</span>
            </p>
            <IntentSwitch query={query} />
          </div>
          <h1 className="mt-2 font-display text-heading-2 text-ink-900 lg:text-display-1">{heading}</h1>
          {/* Focusable from script: removing the last filter chip, or Clear
              all, hands focus here, and the new count is then read out. */}
          <p id="results-count" tabIndex={-1} className="mt-1.5 text-body text-ink-700 outline-none lg:text-body-lg" aria-live="polite">
            {/* The count is the first thing a returning user checks after a
                filter change, so it is announced rather than silently redrawn. */}
            {pending ? (
              <span className="text-ink-500">Updating results…</span>
            ) : total === 0 ? (
              'No properties match these filters'
            ) : (
              <>
                <span className="font-semibold text-ink-900 tabular">{total.toLocaleString('en-IN')}</span>{' '}
                {total === 1 ? 'property' : 'properties'}
                {activeCount > 0 && <span className="text-ink-500"> · {activeCount} {activeCount === 1 ? 'filter' : 'filters'} applied</span>}
              </>
            )}
          </p>
          {/* Shortcuts to the localities in these results, each with the
              number it would show — the facet count, with every other filter
              still applied — as on the homepage hero. Only while no locality
              is chosen: then "narrow to one place" is the obvious next step. */}
          {shortcuts.length > 0 && (
            <nav aria-label="Narrow to a locality" className="mt-4 lg:mt-5">
              <ul className="search-shortcuts">
                {shortcuts.map(([slug, count]) => (
                  <li key={slug} className="flex-none">
                    <Link
                      href={buildSearchUrl(withFilterChange(query, { localities: [slug] }))}
                      scroll={false}
                      className="search-shortcut"
                    >
                      {names.get(slug) ?? slug}
                      <span className="search-shortcut-count tabular">{count}<span className="sr-only"> {count === 1 ? 'property' : 'properties'}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </header>

      <div className="home-container pb-12 pt-4 lg:pt-8">
        {/* List view: the UI-15 frame, filter rail and results. Map view
            (UI-21): the results beside the map from 1024px, with the
            filters in the sheet on every width; on a phone the map takes
            the results' place and List brings them back. */}
        <div className={mapView ? cn(map && 'search-split') : 'lg:grid lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:items-start lg:gap-8'}>
          {!mapView && <aside ref={rail} aria-label="Filters" className="search-rail hidden lg:block">
            <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-5 py-4">
              <h2 className="flex items-center gap-2.5 font-display text-heading-3 text-ink-900">
                <span aria-hidden className="grid size-8 place-items-center rounded-full bg-brand-50 text-brand-700"><SlidersIcon className="size-4" /></span>
                Filters
              </h2>
              {activeCount > 0 && (
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-caption font-semibold text-brand-700 tabular">{activeCount} applied</span>
              )}
            </div>
            <div className="px-5">
              <FilterControls
                query={query}
                facets={facets}
                localityNames={names}
                onChange={apply}
                idPrefix="rail"
              />
            </div>
          </aside>}

          <div className="search-split-list min-w-0">
            {/* Filters (phones and tablets), the range shown and Sort, on one
                row. A native select is as wide as its LONGEST option ("Price
                per sqft: low to high"), so the sort form takes the remaining
                width and the select inside it may shrink and truncate
                (min-w-0 all the way down): with a fixed or shrink-0 select it
                pushed the page, and the fixed bottom bar with it, sideways
                below ~350px. */}
            <div className="flex flex-wrap items-center gap-3">
              <ViewSwitch query={query} className="max-sm:w-full lg:order-last" />
              <Button
                ref={filtersButton}
                variant="secondary"
                className={cn('shrink-0 rounded-full', !mapView && 'lg:hidden')}
                onClick={() => setSheetOpen(true)}
                aria-haspopup="dialog"
              >
                <FilterGlyph />
                Filters
                {activeCount > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-caption font-semibold text-on-brand tabular">
                    {activeCount}
                  </span>
                )}
              </Button>
              {total > 0 && !mapView && (
                <p className="text-body-sm text-ink-700 max-lg:hidden">
                  Showing <span className="font-semibold text-ink-900 tabular">{from}–{to}</span> of{' '}
                  <span className="font-semibold text-ink-900 tabular">{total.toLocaleString('en-IN')}</span>
                </p>
              )}

              {/* A GET form to this search's URL, so sorting works without
                  JavaScript: the other parameters ride along as hidden
                  fields and the Sort button exists only when scripting is
                  off. With JavaScript the select applies on change. */}
              <form method="get" action={sortBase.pathname} className={cn('ml-auto flex min-w-0 flex-1 items-center justify-end gap-2', !mapView && 'lg:flex-none')}>
                {[...sortBase.searchParams].map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
                <label className="search-sort w-full lg:w-auto">
                  <span className="shrink-0 text-ink-500">Sort</span>
                  {/* 16px: a smaller select zooms the page on iPhone when it
                      is tapped (UI-13). */}
                  <select
                    name="sort"
                    value={query.sort}
                    onChange={(e) => sortTo(e.target.value as SortKey)}
                    aria-label="Sort results"
                    className="min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent py-2 pr-9 text-base font-semibold text-ink-900 outline-none lg:max-w-[15rem]"
                  >
                    {SORT_ORDER.map((k) => (
                      <option key={k} value={k}>
                        {SORT_LABEL[k]}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 size-4 text-ink-500" />
                </label>
                <noscript><Button type="submit" variant="secondary">Sort</Button></noscript>
              </form>
            </div>

            {activeCount > 0 && (
              <div data-chip-group className="active-filters mt-3 flex flex-wrap items-center gap-x-2 gap-y-3 lg:mt-4">
                <h2 className="sr-only">Active filters</h2>
                {active.map((f) => (
                  <Chip
                    key={f.id}
                    className="chip-enter"
                    tone="outline"
                    label={f.label}
                    removeLabel={`Remove filter: ${f.label}`}
                    onRemove={() => apply(f.remove)}
                    removeHref={buildSearchUrl(withFilterChange(query, f.remove))}
                    focusAfterRemove="results-count"
                  />
                ))}
                <ClearAll href={clearHref} onClear={() => apply(clearAllPatch())} focusAfter="results-count" />
              </div>
            )}

            {/* The results dim rather than disappear while a change is in
                flight. Replacing them with skeletons on every tick makes a
                multi-filter session flash constantly; keeping them visible
                and inert preserves the user's place. */}
            <div
              id="search-results"
              className={cn('mt-4 transition-opacity lg:mt-5', mapView && map && 'max-lg:hidden', pending && 'pointer-events-none opacity-55')}
              aria-busy={pending}
            >
              {children}
            </div>
          </div>
          {mapView && map && <div className={cn('search-split-map', pending && 'pointer-events-none opacity-55')}>{map}</div>}
        </div>
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        reopened={restored?.sheet}
        returnFocusRef={filtersButton}
        initialFocus={restored?.sheet ? () => findRestored(sheetBody.current, restored.focus) : undefined}
        title="Filters"
        description="Narrow these results by locality, budget, configuration and more"
        footer={
          <Button variant="primary" fullWidth className="rounded-full" onClick={() => setSheetOpen(false)}>
            {pending
              ? 'Updating…'
              : total === 0
                ? 'No matches — adjust filters'
                : `Show ${total.toLocaleString('en-IN')} ${total === 1 ? 'property' : 'properties'}`}
          </Button>
        }
      >
        {/* Changes apply immediately rather than on a Save button, so the
            count in the footer is always the truth about what is behind the
            sheet. A staged sheet would need a second copy of the filter
            state, which is the thing this whole design avoids. */}
        {/* Focusable from script: Clear all removes itself, and focus must
            stay inside the sheet rather than fall to <body>. */}
        <div ref={sheetBody} id="filters-sheet-body" tabIndex={-1} className="px-4 outline-none">
          {activeCount > 0 && (
            <div className="flex items-center justify-between gap-2 border-b border-border-subtle py-3">
              <span className="text-body-sm text-ink-700">
                {activeCount} {activeCount === 1 ? 'filter' : 'filters'} applied
              </span>
              <ClearAll href={clearHref} onClear={() => apply(clearAllPatch())} focusAfter="filters-sheet-body" />
            </div>
          )}
          <FilterControls
            query={query}
            facets={facets}
            localityNames={names}
            onChange={apply}
            idPrefix="sheet"
          />
        </div>
      </Sheet>
    </div>
  )
}

/**
 * Carried across a remount (UI-15). A filter that moves the URL to another
 * path — one locality's landing page, /buy/kolkata/salt-lake, to two
 * localities, /buy/kolkata?loc=… — gives the results page a new route
 * segment, so React replaces this frame with a new one. The filter sheet
 * closed under the user's finger, and keyboard focus fell to <body>.
 * Module state survives the swap; the new frame reads it once, on mount,
 * and only if the change happened a moment ago.
 */
type Carry = { at: number; sheet: boolean; focus: string | null; railScroll: number; sheetScroll: number }
let carry: Carry | null = null
const CARRY_MS = 10_000

/** The successor of the control that had focus: by restore key, id or name. */
function findRestored(scope: HTMLElement | null, key: string | null): HTMLElement | null {
  if (!key) return null
  if (key.startsWith('#')) return document.getElementById(key.slice(1))
  const selector = key.startsWith('@') ? `[aria-label="${CSS.escape(key.slice(1))}"]` : `[data-restore="${CSS.escape(key)}"]`
  return (scope ?? document).querySelector<HTMLElement>(selector)
}

/**
 * Clear all, beside the chips and in the filter sheet: one control.
 *
 * A link to the unfiltered URL, so it works without JavaScript; a plain
 * click keeps the in-place transition. A 44px target around the 32px pill,
 * as on the chips beside it. Clearing removes the link itself, so focus is
 * handed to `focusAfter` first (UI-13); the sheet's copy used to be a
 * separate button that dropped focus to <body>.
 */
function ClearAll({ href, onClear, focusAfter }: { href: string; onClear: () => void; focusAfter: string }) {
  return (
    <a
      href={href}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        if (document.activeElement === event.currentTarget) document.getElementById(focusAfter)?.focus()
        onClear()
      }}
      className="group -my-1.5 inline-flex h-11 shrink-0 items-center text-label text-brand-600 outline-none"
    >
      <span className="inline-flex h-8 items-center rounded-full px-3 group-hover:bg-brand-100 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-focus-ring">Clear all</span>
    </a>
  )
}

/**
 * List | Map (UI-21). Links, because the mode is in the URL: they work
 * without JavaScript, a shared map link opens on the map, and back returns
 * to the list. Same page, same results: switching keeps the filters, sort
 * and page, and focus stays on the switch (the frame does not remount).
 * The Buy | Rent switch's pill, reused.
 */
function ViewSwitch({ query, className }: { query: SearchQuery; className?: string }) {
  const map = query.view === 'map'
  return (
    <nav aria-label="Show results as" className={cn('search-intent search-view', className)}>
      <Link href={buildSearchUrl({ ...query, view: undefined })} scroll={false} aria-current={map ? undefined : 'page'} className="search-intent-link">
        <span><ListGlyph />List</span>
      </Link>
      <Link href={buildSearchUrl({ ...query, view: 'map' })} scroll={false} aria-current={map ? 'page' : undefined} className="search-intent-link">
        <span><MapPinIcon className="size-4" />Map</span>
      </Link>
    </nav>
  )
}

function ListGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  )
}

function FilterGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
      <path d="M3 6h18M6 12h12M10 18h4" />
    </svg>
  )
}
