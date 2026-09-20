'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { searchLocations } from '@/lib/location/queries'
import type { Location } from '@/lib/location/types'
import { useIsDesktop } from '@/lib/hooks/useMediaQuery'
import { Sheet } from '@/components/ui/Sheet'
import { cn } from '@/lib/cn'

/**
 * Multi-select locality search.
 *
 * Real buyers search several localities at once — "New Town or Salt Lake
 * or Rajarhat" — so selection is a set of chips, not a single value.
 *
 * Desktop renders an inline combobox; phones open a full-screen sheet,
 * because multi-field entry inside a 390px form does not work. One
 * rendering is chosen at a time rather than shipping both and hiding one.
 *
 * Phase 3 moves the lookup behind a debounced /api/places/suggest call;
 * the fixture is small enough to resolve in the client for now.
 */
export function LocationField({
  selected,
  onChange,
}: {
  selected: Location[]
  onChange: (next: Location[]) => void
}) {
  const isDesktop = useIsDesktop()
  const [open, setOpen] = useState(false)

  const add = (loc: Location) => {
    if (!selected.some((s) => s.slug === loc.slug)) onChange([...selected, loc])
  }
  const remove = (slug: string) => onChange(selected.filter((s) => s.slug !== slug))

  if (isDesktop) {
    return <InlineCombobox selected={selected} onAdd={add} onRemove={remove} />
  }

  const summary =
    selected.length === 0
      ? 'Search a locality in Kolkata'
      : selected.map((s) => s.name).join(', ')

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex min-h-12 w-full items-center gap-2 rounded-md border border-border-subtle bg-surface-000 px-3 py-2 text-left',
          'hover:border-border-strong',
        )}
      >
        <SearchGlyph />
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-body',
            selected.length ? 'text-ink-900' : 'text-ink-500',
          )}
        >
          {summary}
        </span>
        {selected.length > 1 && (
          <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-caption font-semibold text-brand-600">
            {selected.length}
          </span>
        )}
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Where are you looking?"
        description="Search and select one or more localities in Kolkata"
        footer={
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-12 w-full rounded-md bg-brand-600 text-label text-on-brand"
          >
            {selected.length === 0
              ? 'Search all of Kolkata'
              : `Done · ${selected.length} ${selected.length === 1 ? 'locality' : 'localities'}`}
          </button>
        }
      >
        <SheetPicker selected={selected} onAdd={add} onRemove={remove} />
      </Sheet>
    </>
  )
}

/* ------------------------------------------------------------------ */

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5 shrink-0 text-ink-500" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  )
}

function SelectedChips({ selected, onRemove }: { selected: Location[]; onRemove: (slug: string) => void }) {
  if (!selected.length) return null
  return (
    <ul className="flex flex-wrap gap-2">
      {selected.map((s) => (
        <li key={s.slug}>
          <span className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-100 py-0 pl-3 pr-1 text-body-sm font-medium text-brand-600">
            <span className="max-w-[12rem] truncate">{s.name}</span>
            <button
              type="button"
              onClick={() => onRemove(s.slug)}
              aria-label={`Remove ${s.name}`}
              className="grid size-6 place-items-center rounded-full hover:bg-brand-600/15"
            >
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </span>
        </li>
      ))}
    </ul>
  )
}

function ResultList({
  results,
  selected,
  onAdd,
  onRemove,
  activeIndex,
  listboxId,
  size = 'md',
}: {
  results: Location[]
  selected: Location[]
  onAdd: (l: Location) => void
  onRemove: (slug: string) => void
  activeIndex?: number
  listboxId: string
  size?: 'md' | 'lg'
}) {
  return (
    <ul id={listboxId} role="listbox" aria-multiselectable className="py-1">
      {results.map((l, i) => {
        const isSelected = selected.some((s) => s.slug === l.slug)
        return (
          <li key={l.slug}>
            <button
              type="button"
              role="option"
              aria-selected={isSelected}
              id={`${listboxId}-opt-${i}`}
              onClick={() => (isSelected ? onRemove(l.slug) : onAdd(l))}
              className={cn(
                'flex w-full items-center gap-3 px-4 text-left',
                size === 'lg' ? 'min-h-13 py-2' : 'min-h-11 py-1.5',
                activeIndex === i ? 'bg-brand-100' : 'hover:bg-surface-100',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body text-ink-900">{l.name}</span>
                <span className="block truncate text-body-sm text-ink-500">{l.displayPath}</span>
              </span>
              <span
                aria-hidden
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-sm border',
                  isSelected ? 'border-brand-600 bg-brand-600 text-on-brand' : 'border-border-strong',
                )}
              >
                {isSelected && (
                  <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function SheetPicker({
  selected,
  onAdd,
  onRemove,
}: {
  selected: Location[]
  onAdd: (l: Location) => void
  onRemove: (slug: string) => void
}) {
  const [query, setQuery] = useState('')
  const listboxId = useId()
  const results = useMemo(() => searchLocations(query, 20), [query])

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border-subtle bg-surface-000 p-4">
        <div className="flex h-12 items-center gap-2 rounded-md border border-border-subtle px-3 focus-within:border-brand-600">
          <SearchGlyph />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try New Town, Salt Lake, Ballygunge"
            aria-label="Search localities"
            aria-controls={listboxId}
            className="min-w-0 flex-1 bg-transparent text-body text-ink-900 outline-none placeholder:text-ink-500"
          />
        </div>
        {selected.length > 0 && (
          <div className="mt-3">
            <SelectedChips selected={selected} onRemove={onRemove} />
          </div>
        )}
      </div>

      {query.trim().length < 2 ? (
        <p className="px-4 py-6 text-body-sm text-ink-500">
          Type at least two letters to search. You can pick more than one locality.
        </p>
      ) : results.length === 0 ? (
        <p className="px-4 py-6 text-body-sm text-ink-500">
          No locality matches “{query}”. Check the spelling, or search all of Kolkata.
        </p>
      ) : (
        <ResultList
          results={results}
          selected={selected}
          onAdd={onAdd}
          onRemove={onRemove}
          listboxId={listboxId}
          size="lg"
        />
      )}
    </div>
  )
}

function InlineCombobox({
  selected,
  onAdd,
  onRemove,
}: {
  selected: Location[]
  onAdd: (l: Location) => void
  onRemove: (slug: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const listboxId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const results = useMemo(() => searchLocations(query, 8), [query])
  const showList = open && query.trim().length >= 2

  const commit = (l: Location | undefined) => {
    if (!l) return
    onAdd(l)
    setQuery('')
    setActiveIndex(0)
  }

  return (
    <div
      ref={wrapRef}
      className="relative min-w-0 flex-1"
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <div
        className={cn(
          'flex min-h-12 flex-wrap items-center gap-2 rounded-md border bg-surface-000 px-3 py-1.5',
          showList ? 'border-brand-600' : 'border-border-subtle',
        )}
      >
        <SearchGlyph />
        <SelectedChips selected={selected} onRemove={onRemove} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIndex((i) => Math.min(i + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter' && showList) {
              e.preventDefault()
              commit(results[activeIndex])
            } else if (e.key === 'Escape') {
              setOpen(false)
            } else if (e.key === 'Backspace' && query === '' && selected.length) {
              onRemove(selected[selected.length - 1]!.slug)
            }
          }}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listboxId}-opt-${activeIndex}` : undefined}
          aria-label="Search localities in Kolkata"
          placeholder={selected.length ? 'Add another locality' : 'Search a locality in Kolkata'}
          className="h-9 min-w-[10rem] flex-1 bg-transparent text-body text-ink-900 outline-none placeholder:text-ink-500"
        />
      </div>

      {showList && (
        <div className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-80 overflow-y-auto rounded-md border border-border-subtle bg-surface-raised shadow-e2">
          {results.length === 0 ? (
            <p className="px-4 py-4 text-body-sm text-ink-500">
              No locality matches “{query}”.
            </p>
          ) : (
            <ResultList
              results={results}
              selected={selected}
              onAdd={commit}
              onRemove={onRemove}
              activeIndex={activeIndex}
              listboxId={listboxId}
            />
          )}
        </div>
      )}
    </div>
  )
}
