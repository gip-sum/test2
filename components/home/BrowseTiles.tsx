import Link from 'next/link'
import { BUY_BUDGET_BANDS, buildSearchUrl } from '@/lib/search/query'
import { PROPERTY_TYPE_LABEL, type PropertyTypeCode } from '@/lib/property/types'
import { LAUNCH_CITY } from '@/lib/brand'

/**
 * Converts vague intent into a specific filtered URL.
 *
 * Two jobs: it removes a decision for someone who knows only their budget
 * or their configuration, and it is the main internal-linking surface into
 * the landing matrix — which is what makes the site navigable in depth
 * rather than flat.
 */
const BHK = [1, 2, 3, 4] as const
const TYPES: PropertyTypeCode[] = ['APARTMENT', 'INDEPENDENT_HOUSE', 'BUILDER_FLOOR', 'VILLA']

export function BrowseTiles() {
  const url = (o: Parameters<typeof buildSearchUrl>[0]) => buildSearchUrl(o)
  const base = { intent: 'buy' as const, city: LAUNCH_CITY.slug, localities: [], propertyTypes: [], bedrooms: [] }

  return (
    <section aria-labelledby="browse-by" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <h2 id="browse-by" className="font-display text-heading-3 text-ink-900">
          Browse by budget
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {BUY_BUDGET_BANDS.map((b) => (
            <li key={b.label}>
              <Link
                href={url({ ...base, priceMin: b.min, priceMax: b.max })}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface-000 px-4 text-body-sm text-ink-900 hover:border-brand-600"
              >
                <span className="tabular">{b.label}</span>
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="font-display text-heading-3 text-ink-900">Browse by configuration</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {BHK.map((n) => (
            <li key={n}>
              <Link
                href={url({ ...base, bedrooms: [n] })}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface-000 px-4 text-body-sm text-ink-900 hover:border-brand-600"
              >
                <span>{n} BHK flats in {LAUNCH_CITY.name}</span>
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="sm:col-span-2 lg:col-span-1">
        <h2 className="font-display text-heading-3 text-ink-900">Browse by property type</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {TYPES.map((t) => (
            <li key={t}>
              <Link
                href={url({ ...base, propertyTypes: [t] })}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface-000 px-4 text-body-sm text-ink-900 hover:border-brand-600"
              >
                <span className="truncate">{PROPERTY_TYPE_LABEL[t]}</span>
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-ink-500" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
