'use client'

import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import {
  AMENITY_LABEL,
  AMENITY_ORDER,
  CONSTRUCTION_LABEL,
  FACING_LABEL,
  FACING_ORDER,
  FURNISHING_LABEL,
  FURNISHING_ORDER,
  PROPERTY_TYPE_LABEL,
  PROPERTY_TYPE_ORDER,
  SELLER_LABEL,
  SELLER_ORDER,
} from '@/lib/property/types'
import type { Facets } from '@/lib/property/search'
import {
  BUY_BUDGET_BANDS,
  POSTED_SINCE_LABEL,
  RENT_BUDGET_BANDS,
  type PostedSince,
  type SearchQuery,
} from '@/lib/search/query'

/**
 * Every filter, in one component.
 *
 * The desktop rail and the mobile sheet both render THIS — they differ only
 * in the frame around it. Two copies of nineteen filters would drift within
 * a sprint, and the drift would be invisible until someone filtered on a
 * phone and got a different result set than on a laptop.
 *
 * Nothing here holds filter state. Every control reports a patch upward and
 * the URL changes; the next render comes back from the server with new
 * counts. The only local state is the text sitting in a range input before
 * it is committed, which is input state, not filter state.
 *
 * Counts come from the server with exclusion semantics already applied, so
 * a row showing "(0)" genuinely means ticking it would empty the results —
 * it is disabled rather than hidden, because a facet that disappears when
 * it reaches zero makes the list jump under the user's finger.
 */
export type FilterPatch = Partial<SearchQuery>

type Props = {
  query: SearchQuery
  facets: Facets
  /** slug → display name, for the locality facet. */
  localityNames: Map<string, string>
  onChange: (patch: FilterPatch) => void
  /** Rendered inside the first group on mobile, where space is scarcest. */
  idPrefix?: string
}

/** Toggle a value in a multi-select array. */
function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function FilterControls({ query, facets, localityNames, onChange, idPrefix = 'f' }: Props) {
  const isRent = query.intent === 'rent'
  const bands = isRent ? RENT_BUDGET_BANDS : BUY_BUDGET_BANDS

  // Selected localities first, then the rest by count.
  //
  // Sorting purely by count buries the user's own selection: with fourteen
  // localities in a scrolling box, picking two low-inventory ones puts them
  // below the fold of the control that set them, so the list appears to
  // have forgotten the choice. Any locality the user chose is also pinned
  // in even at zero, for the same reason.
  const selectedSet = new Set(query.localities)
  const localityRows = [...facets.localities.entries()]
    .map(([slug, count]) => ({ slug, count, name: localityNames.get(slug) ?? slug }))
    .concat(
      query.localities
        .filter((s) => !facets.localities.has(s))
        .map((slug) => ({ slug, count: 0, name: localityNames.get(slug) ?? slug })),
    )
    .sort(
      (a, b) =>
        Number(selectedSet.has(b.slug)) - Number(selectedSet.has(a.slug)) ||
        b.count - a.count ||
        a.name.localeCompare(b.name),
    )

  return (
    <div className="flex flex-col">
      <Group title="Locality" defaultOpen count={query.localities.length}>
        <div className="max-h-72 overflow-y-auto pr-1">
          <Rows>
            {localityRows.map((l) => (
              <CheckRow
                key={l.slug}
                label={l.name}
                count={l.count}
                checked={query.localities.includes(l.slug)}
                onToggle={() => onChange({ localities: toggle(query.localities, l.slug) })}
              />
            ))}
          </Rows>
        </div>
      </Group>

      <Group title="Budget" defaultOpen count={query.priceMin != null || query.priceMax != null ? 1 : 0}>
        <Rows>
          {bands.map((b, i) => {
            const checked = query.priceMin === b.min && query.priceMax === b.max
            return (
              <CheckRow
                key={b.label}
                shape="radio"
                label={b.label}
                count={facets.budgetBands[i] ?? 0}
                checked={checked}
                onToggle={() =>
                  onChange(
                    checked
                      ? { priceMin: undefined, priceMax: undefined }
                      : { priceMin: b.min, priceMax: b.max },
                  )
                }
              />
            )
          })}
        </Rows>
        <RangeFields
          idPrefix={`${idPrefix}-price`}
          legend={isRent ? 'Or a monthly rent range (₹)' : 'Or a price range (₹)'}
          min={query.priceMin}
          max={query.priceMax}
          onCommit={(priceMin, priceMax) => onChange({ priceMin, priceMax })}
        />
      </Group>

      <Group title="Bedrooms" defaultOpen count={query.bedrooms.length}>
        <ChipRow>
          {[1, 2, 3, 4, 5].map((n) => (
            <ToggleChip
              key={n}
              label={`${n} BHK`}
              count={facets.bedrooms.get(n) ?? 0}
              checked={query.bedrooms.includes(n)}
              onToggle={() => onChange({ bedrooms: toggle(query.bedrooms, n) })}
            />
          ))}
        </ChipRow>
      </Group>

      <Group title="Property type" defaultOpen count={query.propertyTypes.length}>
        <Rows>
          {PROPERTY_TYPE_ORDER.map((t) => (
            <CheckRow
              key={t}
              label={PROPERTY_TYPE_LABEL[t]}
              count={facets.propertyTypes.get(t) ?? 0}
              checked={query.propertyTypes.includes(t)}
              onToggle={() => onChange({ propertyTypes: toggle(query.propertyTypes, t) })}
            />
          ))}
        </Rows>
      </Group>

      <Group title="Construction status" count={query.construction ? 1 : 0}>
        <Rows>
          {(['READY', 'UNDER_CONSTRUCTION'] as const).map((c) => (
            <CheckRow
              key={c}
              shape="radio"
              label={CONSTRUCTION_LABEL[c]}
              count={facets.construction.get(c) ?? 0}
              checked={query.construction === c}
              onToggle={() => onChange({ construction: query.construction === c ? undefined : c })}
            />
          ))}
        </Rows>
      </Group>

      <Group title="Carpet area" count={query.areaMin != null || query.areaMax != null ? 1 : 0}>
        <RangeFields
          idPrefix={`${idPrefix}-area`}
          legend="Carpet area (sqft)"
          min={query.areaMin}
          max={query.areaMax}
          onCommit={(areaMin, areaMax) => onChange({ areaMin, areaMax })}
        />
        <p className="mt-2 text-caption text-ink-500">
          Carpet area only — never super built-up. Comparing the two is what makes a listing look
          cheaper than it is.
        </p>
      </Group>

      <Group title="Bathrooms" count={query.bathroomsMin != null ? 1 : 0}>
        <ChipRow>
          {[1, 2, 3, 4].map((n) => (
            <ToggleChip
              key={n}
              label={`${n}+`}
              checked={query.bathroomsMin === n}
              onToggle={() => onChange({ bathroomsMin: query.bathroomsMin === n ? undefined : n })}
            />
          ))}
        </ChipRow>
      </Group>

      <Group title="Furnishing" count={query.furnishing.length}>
        <Rows>
          {FURNISHING_ORDER.map((f) => (
            <CheckRow
              key={f}
              label={FURNISHING_LABEL[f]}
              count={facets.furnishing.get(f) ?? 0}
              checked={query.furnishing.includes(f)}
              onToggle={() => onChange({ furnishing: toggle(query.furnishing, f) })}
            />
          ))}
        </Rows>
      </Group>

      <Group title="Posted by" count={query.sellerTypes.length}>
        <Rows>
          {SELLER_ORDER.map((s) => (
            <CheckRow
              key={s}
              label={SELLER_LABEL[s]}
              count={facets.sellerTypes.get(s) ?? 0}
              checked={query.sellerTypes.includes(s)}
              onToggle={() => onChange({ sellerTypes: toggle(query.sellerTypes, s) })}
            />
          ))}
        </Rows>
      </Group>

      <Group title="Amenities" count={query.amenities.length}>
        <Rows>
          {AMENITY_ORDER.map((a) => (
            <CheckRow
              key={a}
              label={AMENITY_LABEL[a]}
              count={facets.amenities.get(a) ?? 0}
              checked={query.amenities.includes(a)}
              onToggle={() => onChange({ amenities: toggle(query.amenities, a) })}
            />
          ))}
        </Rows>
        <p className="mt-2 text-caption text-ink-500">
          Selecting more than one means all of them, not any of them.
        </p>
      </Group>

      <Group title="Parking" count={query.parkingMin != null ? 1 : 0}>
        <Rows>
          <CheckRow
            label="Has parking"
            count={facets.withParking}
            checked={query.parkingMin === 1}
            onToggle={() => onChange({ parkingMin: query.parkingMin === 1 ? undefined : 1 })}
          />
          <CheckRow
            shape="radio"
            label="Two or more spaces"
            checked={query.parkingMin === 2}
            onToggle={() => onChange({ parkingMin: query.parkingMin === 2 ? undefined : 2 })}
          />
        </Rows>
      </Group>

      <Group title="Facing" count={query.facing.length}>
        <ChipRow>
          {FACING_ORDER.map((f) => (
            <ToggleChip
              key={f}
              label={FACING_LABEL[f]}
              count={facets.facing.get(f) ?? 0}
              checked={query.facing.includes(f)}
              onToggle={() => onChange({ facing: toggle(query.facing, f) })}
            />
          ))}
        </ChipRow>
      </Group>

      <Group title="Floor" count={query.floorMin != null || query.floorMax != null ? 1 : 0}>
        <RangeFields
          idPrefix={`${idPrefix}-floor`}
          legend="Floor number"
          min={query.floorMin}
          max={query.floorMax}
          onCommit={(floorMin, floorMax) => onChange({ floorMin, floorMax })}
        />
        <p className="mt-2 text-caption text-ink-500">
          Listings that do not state a floor are excluded while this is set.
        </p>
      </Group>

      <Group title="Property age" count={query.ageMax != null ? 1 : 0}>
        <ChipRow>
          {[1, 5, 10, 20].map((n) => (
            <ToggleChip
              key={n}
              label={n === 1 ? 'Under 1 year' : `Up to ${n} years`}
              checked={query.ageMax === n}
              onToggle={() => onChange({ ageMax: query.ageMax === n ? undefined : n })}
            />
          ))}
        </ChipRow>
        <p className="mt-2 text-caption text-ink-500">
          Listings with no stated age are excluded while this is set.
        </p>
      </Group>

      <Group title={isRent ? 'Rent per sqft' : 'Price per sqft'} count={query.psfMax != null ? 1 : 0}>
        <RangeFields
          idPrefix={`${idPrefix}-psf`}
          legend="Maximum ₹ per carpet sqft"
          min={undefined}
          max={query.psfMax}
          hideMin
          onCommit={(_min, psfMax) => onChange({ psfMax })}
        />
      </Group>

      <Group title="Posted within" count={query.postedSince ? 1 : 0}>
        <Rows>
          {(['1d', '7d', '30d'] as PostedSince[]).map((k) => (
            <CheckRow
              key={k}
              shape="radio"
              label={POSTED_SINCE_LABEL[k]}
              count={facets.postedSince.get(k) ?? 0}
              checked={query.postedSince === k}
              onToggle={() => onChange({ postedSince: query.postedSince === k ? undefined : k })}
            />
          ))}
        </Rows>
      </Group>

      {isRent && (
        <Group title="Available by" count={query.availableBy ? 1 : 0}>
          <DateField
            id={`${idPrefix}-by`}
            label="Available on or before"
            value={query.availableBy}
            onCommit={(availableBy) => onChange({ availableBy })}
          />
        </Group>
      )}

      <Group title="Listing quality" count={Number(!!query.withPhotosOnly) + Number(!!query.priceReducedOnly)}>
        <Rows>
          <CheckRow
            label="With photos only"
            count={facets.withPhotos}
            checked={query.withPhotosOnly === true}
            onToggle={() => onChange({ withPhotosOnly: query.withPhotosOnly ? undefined : true })}
          />
          {!isRent && (
            <CheckRow
              label="Price reduced"
              count={facets.priceReduced}
              checked={query.priceReducedOnly === true}
              onToggle={() => onChange({ priceReducedOnly: query.priceReducedOnly ? undefined : true })}
            />
          )}
        </Rows>
      </Group>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

/**
 * <details> rather than a hand-built accordion: it is keyboard operable,
 * announced correctly, and survives having JavaScript fail to load, for
 * none of the code an ARIA disclosure would cost.
 */
function Group({
  title,
  children,
  defaultOpen,
  count,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  count?: number
}) {
  return (
    <details open={defaultOpen} className="border-b border-border-subtle last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-3 text-label text-ink-900 marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          {title}
          {count ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-caption font-semibold text-on-brand tabular">
              {count}
            </span>
          ) : null}
        </span>
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-ink-500 transition-transform [details[open]_&]:rotate-180" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  )
}

function Rows({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-0.5">{children}</ul>
}

function ChipRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>
}

/**
 * A filter option.
 *
 * `aria-pressed` rather than a checkbox role, because this is a toggle
 * button that re-runs a search, not a form field awaiting submission.
 * `shape="radio"` only changes the glyph — a second click still clears it,
 * which a real radio cannot do and which people expect from a filter.
 */
function CheckRow({
  label,
  count,
  checked,
  onToggle,
  shape = 'check',
}: {
  label: string
  count?: number
  checked: boolean
  onToggle: () => void
  shape?: 'check' | 'radio'
}) {
  const empty = count === 0 && !checked
  return (
    <li>
      <button
        type="button"
        aria-pressed={checked}
        disabled={empty}
        onClick={onToggle}
        className={cn(
          'flex min-h-11 w-full items-center gap-2.5 rounded-md px-2 text-left text-body-sm',
          empty ? 'cursor-not-allowed text-ink-500 opacity-55' : 'text-ink-900 hover:bg-surface-100',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'grid size-5 shrink-0 place-items-center border',
            shape === 'radio' ? 'rounded-full' : 'rounded-sm',
            checked ? 'border-brand-600 bg-brand-600 text-on-brand' : 'border-border-strong',
          )}
        >
          {checked &&
            (shape === 'radio' ? (
              <span className="size-2 rounded-full bg-current" />
            ) : (
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            ))}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count != null && <span className="shrink-0 text-caption text-ink-500 tabular">{count}</span>}
      </button>
    </li>
  )
}

function ToggleChip({
  label,
  count,
  checked,
  onToggle,
}: {
  label: string
  count?: number
  checked: boolean
  onToggle: () => void
}) {
  const empty = count === 0 && !checked
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={empty}
      onClick={onToggle}
      className={cn(
        'inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-label transition-colors',
        checked
          ? 'border-brand-600 bg-brand-100 text-brand-600'
          : empty
            ? 'cursor-not-allowed border-border-subtle bg-surface-000 text-ink-500 opacity-55'
            : 'border-border-subtle bg-surface-000 text-ink-900 hover:border-border-strong',
      )}
    >
      {label}
      {count != null && <span className="text-caption text-ink-500 tabular">{count}</span>}
    </button>
  )
}

/**
 * A numeric range.
 *
 * Holds the typed text locally and commits on blur or Enter. Committing on
 * every keystroke would push a URL — and re-run the search — for "1", "12",
 * "125" on the way to "1250". The local value is reset from props whenever
 * the query changes underneath, so pressing back never leaves a stale
 * number sitting in the box.
 */
function RangeFields({
  idPrefix,
  legend,
  min,
  max,
  onCommit,
  hideMin,
}: {
  idPrefix: string
  legend: string
  min: number | undefined
  max: number | undefined
  onCommit: (min: number | undefined, max: number | undefined) => void
  hideMin?: boolean
}) {
  const [lo, setLo] = useState(min?.toString() ?? '')
  const [hi, setHi] = useState(max?.toString() ?? '')

  // Adjusted during render rather than in an effect. React documents this
  // as the way to reset state when a prop changes: an effect would render
  // once with the stale number, then again with the fresh one, and the user
  // would see the old value flash back after pressing the browser's back
  // button.
  const [lastBounds, setLastBounds] = useState<[number | undefined, number | undefined]>([min, max])
  if (lastBounds[0] !== min || lastBounds[1] !== max) {
    setLastBounds([min, max])
    setLo(min?.toString() ?? '')
    setHi(max?.toString() ?? '')
  }

  const num = (v: string) => {
    const t = v.trim()
    if (t === '') return undefined
    const n = Number(t)
    return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : undefined
  }
  const commit = () => onCommit(hideMin ? undefined : num(lo), num(hi))

  return (
    <fieldset className={cn('min-w-0', hideMin ? '' : 'mt-3')}>
      <legend className="mb-1.5 text-caption text-ink-500">{legend}</legend>
      <div className="flex items-center gap-2">
        {!hideMin && (
          <>
            <input
              id={`${idPrefix}-min`}
              inputMode="numeric"
              value={lo}
              onChange={(e) => setLo(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())}
              placeholder="Min"
              aria-label={`${legend} — minimum`}
              className="h-11 w-full min-w-0 rounded-md border border-border-subtle bg-surface-000 px-3 text-body-sm text-ink-900 tabular placeholder:text-ink-500 hover:border-border-strong"
            />
            <span aria-hidden className="text-ink-500">–</span>
          </>
        )}
        <input
          id={`${idPrefix}-max`}
          inputMode="numeric"
          value={hi}
          onChange={(e) => setHi(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())}
          placeholder="Max"
          aria-label={`${legend} — maximum`}
          className="h-11 w-full min-w-0 rounded-md border border-border-subtle bg-surface-000 px-3 text-body-sm text-ink-900 tabular placeholder:text-ink-500 hover:border-border-strong"
        />
      </div>
    </fieldset>
  )
}

function DateField({
  id,
  label,
  value,
  onCommit,
}: {
  id: string
  label: string
  value: string | undefined
  onCommit: (value: string | undefined) => void
}) {
  const fallbackId = useId()
  return (
    <label htmlFor={id || fallbackId} className="flex flex-col gap-1.5">
      <span className="text-caption text-ink-500">{label}</span>
      <input
        id={id || fallbackId}
        type="date"
        value={value ?? ''}
        onChange={(e) => onCommit(e.target.value || undefined)}
        className="h-11 w-full rounded-md border border-border-subtle bg-surface-000 px-3 text-body-sm text-ink-900 hover:border-border-strong"
      />
    </label>
  )
}
