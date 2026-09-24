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
    <section aria-labelledby="browse-by">
      <div>
        <p className="text-overline uppercase tracking-[0.14em] text-brand-600">Make it yours</p>
        <h2 id="browse-by" className="mt-1 font-display text-heading-2 text-ink-900">
          Find a home your way
        </h2>
        <p className="mt-2 max-w-xl text-body-sm text-ink-500">
          Jump into a search by the detail that matters most to you.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-lg border border-border-subtle bg-surface-000 p-4 shadow-e1 sm:p-5">
        <h3 className="font-display text-heading-3 text-ink-900">Browse by budget</h3>
        <ul className="mt-3 flex flex-col gap-2">
          {BUY_BUDGET_BANDS.map((b) => (
            <li key={b.label}>
              <Link
                href={url({ ...base, priceMin: b.min, priceMax: b.max })}
                className="premium-browse-link flex min-h-11 items-center justify-between gap-3 rounded-md px-3 text-body-sm text-ink-900 transition-colors hover:bg-brand-100 hover:text-brand-700"
              >
                <span className="tabular">{b.label}</span>
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface-000 p-4 shadow-e1 sm:p-5">
        <h3 className="font-display text-heading-3 text-ink-900">Browse by configuration</h3>
        <ul className="mt-3 flex flex-col gap-2">
          {BHK.map((n) => (
            <li key={n}>
              <Link
                href={url({ ...base, bedrooms: [n] })}
                className="premium-browse-link flex min-h-11 items-center justify-between gap-3 rounded-md px-3 text-body-sm text-ink-900 transition-colors hover:bg-brand-100 hover:text-brand-700"
              >
                <span>{n} BHK flats in {LAUNCH_CITY.name}</span>
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface-000 p-4 shadow-e1 sm:col-span-2 sm:p-5 lg:col-span-1">
        <h3 className="font-display text-heading-3 text-ink-900">Browse by property type</h3>
        <ul className="mt-3 flex flex-col gap-2">
          {TYPES.map((t) => (
            <li key={t}>
              <Link
                href={url({ ...base, propertyTypes: [t] })}
                className="premium-browse-link flex min-h-11 items-center justify-between gap-3 rounded-md px-3 text-body-sm text-ink-900 transition-colors hover:bg-brand-100 hover:text-brand-700"
              >
                <span className="truncate">{PROPERTY_TYPE_LABEL[t]}</span>
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      </div>
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
