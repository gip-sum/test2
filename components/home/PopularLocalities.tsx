import Link from 'next/link'
import { getPopularLocalities } from '@/lib/location/queries'
import { getListingCountsByLocality } from '@/lib/property/queries'
import { LAUNCH_CITY } from '@/lib/brand'

/**
 * One-tap entry into the most-searched parts of the city.
 *
 * Counts come from real inventory — never invented. With seeded data they
 * are small, which is honest: that is what a marketplace looks like before
 * sellers arrive. A locality with nothing in it shows no count rather than
 * a zero, because "0" reads as broken where blank reads as new.
 */
export function PopularLocalities({ intent = 'buy' }: { intent?: 'buy' | 'rent' }) {
  const localities = getPopularLocalities()
  const counts = getListingCountsByLocality(intent)

  return (
    <section aria-labelledby="popular-localities">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-overline uppercase tracking-[0.14em] text-brand-600">Explore the city</p>
          <h2 id="popular-localities" className="mt-1 font-display text-heading-2 text-ink-900">
            Popular localities in {LAUNCH_CITY.name}
          </h2>
          <p className="mt-2 max-w-xl text-body-sm text-ink-500">
            Start with neighbourhoods buyers and renters are already exploring.
          </p>
        </div>
        <Link
          href={`/in/${LAUNCH_CITY.slug}`}
          className="inline-flex min-h-11 items-center rounded-md text-label text-brand-600 hover:underline"
        >
          All localities
        </Link>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {localities.map((l) => {
          const count = counts.get(l.slug)
          return (
            <li key={l.slug}>
              <Link
                href={`/${intent}/${LAUNCH_CITY.slug}/${l.slug}`}
                className="home-locality-card group flex min-h-24 items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-000 px-4 py-4 text-ink-900 shadow-e1 transition-all hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-e2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-body font-semibold group-hover:text-brand-600">{l.name}</span>
                  <span className="mt-1 block text-caption text-ink-500">
                    {count ? `${count} ${count === 1 ? 'listing' : 'listings'}` : 'Explore locality'}
                  </span>
                </span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 transition-transform group-hover:translate-x-0.5" aria-hidden>
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
