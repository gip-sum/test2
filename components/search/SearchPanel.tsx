'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IntentTabs } from './IntentTabs'
import { LocationField } from './LocationField'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/cn'
import type { Location } from '@/lib/location/types'
import type { Intent, PropertyTypeCode } from '@/lib/property/types'
import { PROPERTY_TYPE_LABEL } from '@/lib/property/types'
import { BUY_BUDGET_BANDS, RENT_BUDGET_BANDS, buildSearchUrl } from '@/lib/search/query'
import { LAUNCH_CITY } from '@/lib/brand'

const BHK_OPTIONS = [1, 2, 3, 4] as const

/**
 * The homepage search.
 *
 * This is the dominant interaction on the page, not a decorative hero —
 * the homepage exists to turn an ambiguous visitor into a typed intent
 * plus a place, and everything below it is secondary.
 *
 * Submitting builds the canonical route (Phase 0 grammar) rather than
 * posting a form, so the results URL is shareable and indexable from the
 * first interaction.
 */
export function SearchPanel() {
  const router = useRouter()
  const [intent, setIntent] = useState<Intent>('buy')
  const [localities, setLocalities] = useState<Location[]>([])
  const [propertyType, setPropertyType] = useState<PropertyTypeCode | ''>('')
  const [bandIndex, setBandIndex] = useState<number | ''>('')
  const [bedrooms, setBedrooms] = useState<number[]>([])

  const bands = intent === 'buy' ? BUY_BUDGET_BANDS : RENT_BUDGET_BANDS
  const band = bandIndex === '' ? undefined : bands[bandIndex]

  const url = useMemo(
    () =>
      buildSearchUrl({
        intent,
        city: LAUNCH_CITY.slug,
        localities: localities.map((l) => l.slug),
        propertyTypes: propertyType ? [propertyType] : [],
        bedrooms,
        priceMin: band?.min,
        priceMax: band?.max,
      }),
    [intent, localities, propertyType, bedrooms, band],
  )

  /**
   * Switching intent keeps the localities and clears the budget, because a
   * ₹50 L purchase budget is meaningless as a monthly rent. Silently
   * carrying it across would produce zero results and look broken.
   */
  const handleIntentChange = (next: Intent) => {
    if (next === intent) return
    setIntent(next)
    setBandIndex('')
  }

  const toggleBhk = (n: number) =>
    setBedrooms((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        router.push(url)
      }}
      className="rounded-lg border border-border-subtle bg-surface-000 p-3 shadow-e2 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <IntentTabs value={intent} onChange={handleIntentChange} />
        <p className="text-body-sm text-ink-500">
          {intent === 'buy' ? 'Properties for sale in ' : 'Properties for rent in '}
          {LAUNCH_CITY.name}
        </p>
      </div>

      <div className="mt-3 lg:flex lg:items-end lg:gap-2">
        <div className="lg:flex-1">
          <span className="mb-1 block text-overline uppercase text-ink-500 lg:sr-only">Location</span>
          <LocationField selected={localities} onChange={setLocalities} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 lg:mt-0 lg:flex lg:shrink-0">
          <Select
            label="Property type"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value as PropertyTypeCode | '')}
            className="lg:w-44"
          >
            <option value="">Any type</option>
            {(Object.keys(PROPERTY_TYPE_LABEL) as PropertyTypeCode[]).map((code) => (
              <option key={code} value={code}>
                {PROPERTY_TYPE_LABEL[code]}
              </option>
            ))}
          </Select>

          <Select
            label="Budget"
            value={bandIndex}
            onChange={(e) => setBandIndex(e.target.value === '' ? '' : Number(e.target.value))}
            className="lg:w-44"
          >
            <option value="">Any budget</option>
            {bands.map((b, i) => (
              <option key={b.label} value={i}>
                {b.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-overline uppercase text-ink-500">Bedrooms</span>
        <div className="flex flex-wrap gap-2">
          {BHK_OPTIONS.map((n) => {
            const on = bedrooms.includes(n)
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                onClick={() => toggleBhk(n)}
                className={cn(
                  'h-9 rounded-full border px-4 text-label transition-colors',
                  on
                    ? 'border-brand-600 bg-brand-100 text-brand-600'
                    : 'border-border-subtle bg-surface-000 text-ink-900 hover:border-border-strong',
                )}
              >
                {n} BHK
              </button>
            )
          })}
          {bedrooms.length > 0 && (
            <button
              type="button"
              onClick={() => setBedrooms([])}
              className="h-9 rounded-full px-3 text-label text-brand-600 hover:bg-brand-100"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <button
        type="submit"
        className="mt-4 h-12 w-full rounded-md bg-brand-600 text-label text-on-brand hover:bg-brand-700 lg:h-12"
      >
        Search {intent === 'buy' ? 'properties for sale' : 'properties for rent'}
      </button>
    </form>
  )
}
