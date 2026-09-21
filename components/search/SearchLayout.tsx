'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { FilterControls, type FilterPatch } from '@/components/filters/FilterControls'
import { Chip } from '@/components/ui/Chip'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { Facets } from '@/lib/property/search'
import { clearAllPatch, describeActiveFilters } from '@/lib/search/describe'
import {
  SORT_LABEL,
  SORT_ORDER,
  buildSearchUrl,
  withFilterChange,
  type SearchQuery,
  type SortKey,
} from '@/lib/search/query'

/**
 * The results frame: heading, chips, sort, filter rail, filter sheet.
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
  localityNames,
  children,
}: {
  query: SearchQuery
  facets: Facets
  total: number
  heading: string
  /** Plain object, not a Map: this crosses the server/client boundary. */
  localityNames: Record<string, string>
  children: ReactNode
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(false)

  const names = new Map(Object.entries(localityNames))
  const active = describeActiveFilters(query, names)

  /**
   * Filter changes keep the scroll position: the rail is beside the results
   * on desktop and inside a sheet on mobile, and in both cases jumping to
   * the top of the document after a tick would lose the user's place in a
   * list of nineteen filters.
   */
  const apply = (patch: FilterPatch) => {
    startTransition(() => {
      router.push(buildSearchUrl(withFilterChange(query, patch)), { scroll: false })
    })
  }

  const sortTo = (sort: SortKey) => {
    // Sorting is not a filter, so it does not reset the page... except that
    // page 3 of a price-ascending list has nothing to do with page 3 of a
    // newest-first one, so it does.
    startTransition(() => {
      router.push(buildSearchUrl({ ...query, sort, page: 1 }), { scroll: false })
    })
  }

  const activeCount = active.length

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-5 lg:px-8 lg:py-6">
      <header>
        <h1 className="font-display text-heading-2 text-ink-900 lg:text-heading-1">{heading}</h1>
        <p className="mt-1 text-body-sm text-ink-700" aria-live="polite">
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
            </>
          )}
        </p>
      </header>

      {activeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2 className="sr-only">Active filters</h2>
          {active.map((f) => (
            <Chip
              key={f.id}
              label={f.label}
              removeLabel={`Remove filter: ${f.label}`}
              onRemove={() => apply(f.remove)}
            />
          ))}
          <button
            type="button"
            onClick={() => apply(clearAllPatch())}
            className="h-8 rounded-full px-3 text-label text-brand-600 hover:bg-brand-100"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          className="lg:hidden"
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

        <label className="ml-auto flex shrink-0 items-center gap-2 text-body-sm text-ink-700">
          <span className="hidden sm:inline">Sort by</span>
          <select
            value={query.sort}
            onChange={(e) => sortTo(e.target.value as SortKey)}
            aria-label="Sort results"
            className="h-11 max-w-[14rem] rounded-md border border-border-subtle bg-surface-000 px-3 text-body-sm text-ink-900 hover:border-border-strong"
          >
            {SORT_ORDER.map((k) => (
              <option key={k} value={k}>
                {SORT_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-7">
        <aside
          aria-label="Filters"
          className="hidden lg:block lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:rounded-lg lg:border lg:border-border-subtle lg:bg-surface-000 lg:px-4 lg:shadow-e1"
        >
          <FilterControls
            query={query}
            facets={facets}
            localityNames={names}
            onChange={apply}
            idPrefix="rail"
          />
        </aside>

        {/* The results dim rather than disappear while a change is in
            flight. Replacing them with skeletons on every tick makes a
            multi-filter session flash constantly; keeping them visible and
            inert preserves the user's place. */}
        <div
          className={cn('min-w-0 transition-opacity', pending && 'pointer-events-none opacity-55')}
          aria-busy={pending}
        >
          {children}
        </div>
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Filters"
        description="Narrow these results by locality, budget, configuration and more"
        footer={
          <Button variant="primary" fullWidth onClick={() => setSheetOpen(false)}>
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
        <div className="px-4">
          {activeCount > 0 && (
            <div className="flex items-center justify-between gap-2 border-b border-border-subtle py-3">
              <span className="text-body-sm text-ink-700">
                {activeCount} {activeCount === 1 ? 'filter' : 'filters'} applied
              </span>
              <button
                type="button"
                onClick={() => apply(clearAllPatch())}
                className="h-9 rounded-md px-3 text-label text-brand-600 hover:bg-brand-100"
              >
                Clear all
              </button>
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

function FilterGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
      <path d="M3 6h18M6 12h12M10 18h4" />
    </svg>
  )
}
