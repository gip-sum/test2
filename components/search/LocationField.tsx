'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { searchLocations } from '@/lib/location/queries'
import type { Location } from '@/lib/location/types'
import { useIsDesktop } from '@/lib/hooks/useMediaQuery'
import { Sheet } from '@/components/ui/Sheet'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'

/**
 * Multi-select locality search.
 *
 * Real buyers search several localities at once — "New Town or Salt Lake
 * or Rajarhat" — so selection is a set of chips, not a single value.
 *
 * Desktop renders an inline combobox; phones open a full-screen sheet,
 * because multi-field entry inside a 390px form does not work. One
 * rendering is chosen at a time rather than shipping both and hiding one.
 * Both are the SAME combobox (UI-13): the sheet's copy used to be a text box
 * over a list of tabbable buttons marked as options, which a screen reader
 * announced as a listbox that arrow keys did not move through.
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
    return <Combobox mode="inline" selected={selected} onAdd={add} onRemove={remove} />
  }

  const summary =
    selected.length === 0
      ? 'Search a locality in Kolkata'
      : selected.map((s) => s.name).join(', ')

  return (
    <>
      {/* Looks like the field it opens, so it stays hand-drawn rather than a
          Button. The name carries what is chosen, the count included. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={selected.length ? `Localities: ${summary}` : undefined}
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
          <span aria-hidden className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-caption font-semibold text-brand-600">
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
          <Button type="button" size="lg" fullWidth className="text-label" onClick={() => setOpen(false)}>
            {selected.length === 0
              ? 'Search all of Kolkata'
              : `Done · ${selected.length} ${selected.length === 1 ? 'locality' : 'localities'}`}
          </Button>
        }
      >
        <Combobox mode="sheet" selected={selected} onAdd={add} onRemove={remove} />
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

const count = (n: number) => `${n} ${n === 1 ? 'locality' : 'localities'}`

/**
 * The locality combobox (WAI-ARIA combobox with a multi-select listbox).
 *
 * Focus stays in the text box throughout. Arrow keys move the active
 * option (`aria-activedescendant`), Enter adds or removes it. Escape closes
 * the suggestions (inline) or clears the search (sheet, where they are
 * always shown); the next Escape clears the text (inline) or closes the
 * sheet. Options are not tab stops; a tap or click on one
 * toggles it without taking focus from the text box. Backspace in an empty
 * box removes the last chosen locality.
 *
 * Every change is said in words through a polite status: how many
 * localities match as you type, and "Salt Lake added. 2 localities
 * chosen." on a pick, because a tick drawn in a list is not announced.
 */
function Combobox({
  mode,
  selected,
  onAdd,
  onRemove,
}: {
  mode: 'inline' | 'sheet'
  selected: Location[]
  onAdd: (l: Location) => void
  onRemove: (slug: string) => void
}) {
  const inline = mode === 'inline'
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(!inline)
  // Inline, the first suggestion is active (Enter picks it, as before). In
  // the sheet, used by touch, nothing looks chosen until the arrows move.
  const first = inline ? 0 : -1
  const [activeIndex, setActiveIndex] = useState(first)
  const [said, setSaid] = useState('')
  const id = useId()
  const inputId = `${id}-input`, listboxId = `${id}-list`, hintId = `${id}-hint`
  const wrapRef = useRef<HTMLDivElement>(null)
  const results = useMemo(() => searchLocations(query, inline ? 8 : 20), [query, inline])
  const typed = query.trim().length >= 2
  const showList = open && typed && results.length > 0
  const optionId = (i: number) => `${listboxId}-opt-${i}`

  // The active option stays in view as the arrow keys move through a list
  // taller than its box.
  useEffect(() => {
    if (showList && activeIndex >= 0) document.getElementById(`${listboxId}-opt-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, showList, listboxId])

  const toggle = (l: Location | undefined) => {
    if (!l) return
    const chosen = selected.some((s) => s.slug === l.slug)
    const total = selected.length + (chosen ? -1 : 1)
    if (chosen) onRemove(l.slug)
    else onAdd(l)
    setSaid(`${l.name} ${chosen ? 'removed' : 'added'}. ${total ? `${count(total)} chosen.` : 'No locality chosen.'}`)
    // Inline, a pick clears the text for the next one; the sheet keeps its
    // results so several can be picked from one search.
    if (inline && !chosen) { setQuery(''); setActiveIndex(first) }
  }

  const status = said || (typed ? (results.length ? `${count(results.length)} found.` : `No locality matches ${query.trim()}.`) : '')

  return (
    <div
      ref={wrapRef}
      className={inline ? 'relative min-w-0 flex-1' : undefined}
      onBlur={inline ? (e) => { if (!wrapRef.current?.contains(e.relatedTarget as Node)) setOpen(false) } : undefined}
    >
      <div className={cn(!inline && 'sticky top-0 z-10 border-b border-border-subtle bg-surface-000 p-4')}>
        <div
          className={cn(
            'flex min-h-12 flex-wrap items-center gap-2 rounded-md border bg-surface-000 px-3 py-1.5 focus-within:border-brand-600',
            showList ? 'border-brand-600' : 'border-border-subtle',
          )}
        >
          <SearchGlyph />
          {inline && <SelectedChips selected={selected} onRemove={onRemove} inputId={inputId} />}
          {/* 16px: a smaller text box zooms the page on iPhone as it takes
              focus (it was 15px). No browser autofill: the suggestions are
              ours. */}
          <input
            id={inputId}
            data-autofocus={inline ? undefined : ''}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              setActiveIndex(first)
              setSaid('')
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setOpen(true)
                setActiveIndex((i) => Math.min(i + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter') {
                // Enter never submits the search form from here: with text
                // typed it picks the active suggestion.
                if (showList || typed) e.preventDefault()
                if (showList && activeIndex >= 0) toggle(results[activeIndex])
              } else if (e.key === 'Escape') {
                // The first Escape closes the suggestions — inline by hiding
                // them, in the sheet (where they are always shown) by clearing
                // the search; the next clears the text, or closes the sheet.
                if (showList && inline) setOpen(false)
                else if (query) { setQuery(''); setSaid(''); setActiveIndex(first) }
              } else if (e.key === 'Backspace' && query === '' && selected.length) {
                const last = selected[selected.length - 1]!
                onRemove(last.slug)
                setSaid(`${last.name} removed. ${selected.length > 1 ? `${count(selected.length - 1)} chosen.` : 'No locality chosen.'}`)
              }
            }}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
            aria-label={inline ? 'Search localities in Kolkata' : 'Search localities'}
            aria-describedby={hintId}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint={inline ? 'search' : 'done'}
            placeholder={inline ? (selected.length ? 'Add another locality' : 'Search a locality in Kolkata') : 'Try New Town, Salt Lake, Ballygunge'}
            className="h-9 min-w-[10rem] flex-1 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-500"
          />
        </div>
        <p id={hintId} className="sr-only">Type two or more letters, then use the up and down arrows and Enter to choose. You can choose more than one locality.</p>
        <p role="status" className="sr-only">{status}</p>
        {!inline && selected.length > 0 && (
          <div className="mt-3">
            <SelectedChips selected={selected} onRemove={onRemove} inputId={inputId} />
          </div>
        )}
      </div>

      {inline ? (
        open && typed && (
          <div className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-80 overflow-y-auto rounded-md border border-border-subtle bg-surface-raised shadow-e2">
            {results.length === 0 ? (
              <p className="px-4 py-4 text-body-sm text-ink-500">No locality matches “{query.trim()}”.</p>
            ) : (
              <Options results={results} selected={selected} activeIndex={activeIndex} listboxId={listboxId} optionId={optionId} onPick={toggle} />
            )}
          </div>
        )
      ) : !typed ? (
        <p className="px-4 py-6 text-body-sm text-ink-500">
          Type at least two letters to search. You can pick more than one locality.
        </p>
      ) : results.length === 0 ? (
        <p className="px-4 py-6 text-body-sm text-ink-500">
          No locality matches “{query.trim()}”. Check the spelling, or search all of Kolkata.
        </p>
      ) : (
        <Options results={results} selected={selected} activeIndex={activeIndex} listboxId={listboxId} optionId={optionId} onPick={toggle} large />
      )}
      {/* The listbox the text box controls exists even while empty, so its
          aria-controls always points at an element. */}
      {!showList && <div id={listboxId} role="listbox" aria-label="Localities" hidden />}
    </div>
  )
}

function SelectedChips({ selected, onRemove, inputId }: { selected: Location[]; onRemove: (slug: string) => void; inputId: string }) {
  if (!selected.length) return null
  return (
    <ul data-chip-group aria-label="Chosen localities" className="flex flex-wrap gap-x-2 gap-y-3">
      {selected.map((s) => (
        <li key={s.slug}>
          <Chip label={s.name} labelClassName="max-w-[12rem]" onRemove={() => onRemove(s.slug)} removeLabel={`Remove ${s.name}`} focusAfterRemove={inputId} />
        </li>
      ))}
    </ul>
  )
}

/**
 * The suggestions. Options are list items, not buttons: they are reached
 * with the arrow keys from the text box, not by Tab, and a press on one
 * keeps focus in the text box (mousedown is cancelled) so typing continues.
 * Long names wrap rather than truncate, so two similar localities stay
 * distinguishable.
 */
function Options({
  results,
  selected,
  activeIndex,
  listboxId,
  optionId,
  onPick,
  large = false,
}: {
  results: Location[]
  selected: Location[]
  activeIndex: number
  listboxId: string
  optionId: (i: number) => string
  onPick: (l: Location) => void
  large?: boolean
}) {
  return (
    <ul id={listboxId} role="listbox" aria-multiselectable aria-label="Localities" className="py-1">
      {results.map((l, i) => {
        const isSelected = selected.some((s) => s.slug === l.slug)
        return (
          <li
            key={l.slug}
            id={optionId(i)}
            role="option"
            aria-selected={isSelected}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(l)}
            className={cn(
              'flex w-full cursor-pointer items-center gap-3 px-4 text-left',
              large ? 'min-h-13 py-2' : 'min-h-11 py-1.5',
              activeIndex === i ? 'bg-brand-100 outline-2 -outline-offset-2 outline-brand-600' : 'hover:bg-surface-100',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-body text-ink-900 [overflow-wrap:anywhere]">{l.name}</span>
              <span className="block text-body-sm text-ink-500 [overflow-wrap:anywhere]">{l.displayPath}</span>
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
          </li>
        )
      })}
    </ul>
  )
}
