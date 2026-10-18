'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { IntentTabs } from './IntentTabs'
import { LocationField } from './LocationField'
import { Chip } from '@/components/ui/Chip'
import { Sheet } from '@/components/ui/Sheet'
import { SearchIcon, SlidersIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import type { Location } from '@/lib/location/types'
import type { Intent, PropertyTypeCode } from '@/lib/property/types'
import { PROPERTY_TYPE_LABEL, PROPERTY_TYPE_ORDER } from '@/lib/property/types'
import { BUY_BUDGET_BANDS, RENT_BUDGET_BANDS, buildSearchUrl } from '@/lib/search/query'
import { LAUNCH_CITY } from '@/lib/brand'
import { Button } from '@/components/ui/Button'
import { ToggleChip } from '@/components/ui/ToggleChip'

const BHK_OPTIONS = [1, 2, 3, 4] as const

/**
 * The homepage search.
 *
 * The dominant interaction on the page, so on a phone it has to fit the
 * first screen: intent, place and the Search action, nothing else. Property
 * type, budget and bedrooms are one tap away in "More filters" — a sheet on
 * phones, a dialog on desktop — rather than a column of inline fields that
 * pushed the Search button under the bottom navigation. Whatever is chosen
 * there is echoed back as removable chips, so a filter is never invisible.
 *
 * Submitting builds the canonical route (Phase 0 grammar) rather than
 * posting a form, so the results URL is shareable and indexable from the
 * first interaction.
 */
export function SearchPanel() {
  const router = useRouter()
  const [intent, setIntent] = useState<Intent>('buy')
  const [localities, setLocalities] = useState<Location[]>([])
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeCode[]>([])
  const [bandIndex, setBandIndex] = useState<number | null>(null)
  const [bedrooms, setBedrooms] = useState<number[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersTrigger = useRef<HTMLButtonElement>(null)

  const bands = intent === 'buy' ? BUY_BUDGET_BANDS : RENT_BUDGET_BANDS
  const band = bandIndex === null ? undefined : bands[bandIndex]
  const filterCount = propertyTypes.length + (band ? 1 : 0) + bedrooms.length
  const scope = intent === 'buy' ? 'for sale' : 'for rent'

  const url = useMemo(
    () =>
      buildSearchUrl({
        intent,
        city: LAUNCH_CITY.slug,
        localities: localities.map((l) => l.slug),
        propertyTypes,
        bedrooms: [...bedrooms].sort((a, b) => a - b),
        priceMin: band?.min,
        priceMax: band?.max,
      }),
    [intent, localities, propertyTypes, bedrooms, band],
  )

  /**
   * Switching intent keeps the localities and clears the budget, because a
   * ₹50 L purchase budget is meaningless as a monthly rent. Silently
   * carrying it across would produce zero results and look broken.
   */
  const handleIntentChange = (next: Intent) => {
    if (next === intent) return
    setIntent(next)
    setBandIndex(null)
  }

  const toggleType = (t: PropertyTypeCode) =>
    setPropertyTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  const toggleBhk = (n: number) =>
    setBedrooms((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))
  const clearFilters = () => {
    setPropertyTypes([])
    setBandIndex(null)
    setBedrooms([])
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        router.push(url)
      }}
      aria-label="Search properties"
      // The card around it is the hero's (UI-14): the panel is the form only.
      className="relative"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <IntentTabs value={intent} onChange={handleIntentChange} fullWidth />
        <p className="hidden text-body-sm text-ink-500 lg:block">
          Searching properties {scope} in <span className="font-semibold text-ink-900">{LAUNCH_CITY.name}</span>
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2.5 lg:mt-4 lg:flex-row lg:items-start lg:gap-3">
        <div className="min-w-0 lg:flex-1">
          <LocationField selected={localities} onChange={setLocalities} />
        </div>
        <div className="flex gap-2.5">
          <Button
            type="button"
            variant="secondary"
            id="more-filters"
            ref={filtersTrigger}
            onClick={() => setFiltersOpen(true)}
            aria-haspopup="dialog"
            className={cn(
              'h-12 shrink-0',
              filterCount ? 'border-brand-600 bg-brand-100 text-brand-700 hover:border-brand-600' : 'bg-surface-000',
            )}
          >
            <SlidersIcon className="size-4.5" />
            More filters
            {filterCount > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-caption font-semibold text-on-brand">
                {filterCount}
                <span className="sr-only"> selected</span>
              </span>
            )}
          </Button>
          <Button type="submit" size="lg" className="h-12 min-w-0 flex-1 text-label shadow-e1 lg:flex-none lg:px-8">
            <SearchIcon className="size-4.5" />
            Search<span className="sr-only"> properties {scope}</span>
          </Button>
        </div>
      </div>

      {filterCount > 0 && (
        // Removing a chip hands focus to the next one, or to More filters
        // after the last (Chip, UI-13).
        <ul aria-label="Selected filters" data-chip-group className="mt-3 flex flex-wrap gap-x-2 gap-y-3">
          {propertyTypes.map((t) => (
            <li key={t}>
              <Chip label={PROPERTY_TYPE_LABEL[t]} onRemove={() => toggleType(t)} removeLabel={`Remove filter: ${PROPERTY_TYPE_LABEL[t]}`} focusAfterRemove="more-filters" />
            </li>
          ))}
          {band && (
            <li>
              <Chip label={band.label} onRemove={() => setBandIndex(null)} removeLabel={`Remove filter: ${band.label}`} focusAfterRemove="more-filters" />
            </li>
          )}
          {[...bedrooms].sort((a, b) => a - b).map((n) => (
            <li key={n}>
              <Chip label={`${n} BHK`} onRemove={() => toggleBhk(n)} removeLabel={`Remove filter: ${n} BHK`} focusAfterRemove="more-filters" />
            </li>
          ))}
        </ul>
      )}

      <Sheet
        returnFocusRef={filtersTrigger}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="More filters"
        description={`Property type, ${intent === 'buy' ? 'budget' : 'monthly rent'} and bedrooms`}
        footer={
          <div className="flex items-center gap-3">
            {/* aria-disabled, not disabled: Clear all empties itself, and
                disabling the pressed control sent focus out of this sheet to
                the dialog behind it, where Escape then closed neither (UI-13;
                home-check's local failure). */}
            <Button
              type="button"
              variant="tertiary"
              size="lg"
              onClick={clearFilters}
              aria-disabled={filterCount === 0}
              className="h-12 px-4 text-label"
            >
              Clear all
            </Button>
            <Button
              type="button"
              size="lg"
              className="flex-1 text-label"
              onClick={() => {
                setFiltersOpen(false)
                router.push(url)
              }}
            >
              Show properties {scope}
            </Button>
          </div>
        }
      >
        <div className="space-y-6 p-4">
          <FilterGroup legend="Property type">
            {PROPERTY_TYPE_ORDER.map((t) => (
              <ToggleChip key={t} pressed={propertyTypes.includes(t)} onToggle={() => toggleType(t)}>
                {PROPERTY_TYPE_LABEL[t]}
              </ToggleChip>
            ))}
          </FilterGroup>
          <FilterGroup legend={intent === 'buy' ? 'Budget' : 'Monthly rent'}>
            {bands.map((b, i) => (
              <ToggleChip key={b.label} pressed={bandIndex === i} onToggle={() => setBandIndex(bandIndex === i ? null : i)}>
                <span className="tabular">{b.label}</span>
              </ToggleChip>
            ))}
          </FilterGroup>
          <FilterGroup legend="Bedrooms">
            {BHK_OPTIONS.map((n) => (
              <ToggleChip key={n} pressed={bedrooms.includes(n)} onToggle={() => toggleBhk(n)}>
                {n} BHK
              </ToggleChip>
            ))}
          </FilterGroup>
        </div>
      </Sheet>
    </form>
  )
}

function FilterGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="text-label font-semibold text-ink-900">{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}
