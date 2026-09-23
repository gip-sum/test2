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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="popular-localities" className="font-display text-heading-3 text-ink-900">
          Popular localities in {LAUNCH_CITY.name}
        </h2>
        <Link
          href={`/in/${LAUNCH_CITY.slug}`}
          className="rounded-md text-label text-brand-600 hover:underline"
        >
          All localities
        </Link>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {localities.map((l) => {
          const count = counts.get(l.slug)
          return (
            <li key={l.slug}>
              <Link
                href={`/${intent}/${LAUNCH_CITY.slug}/${l.slug}`}
                className="flex min-h-20 items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-000 px-4 py-4 text-body font-semibold text-ink-900 shadow-e1 transition-colors hover:border-brand-600 hover:bg-brand-100 hover:text-brand-600"
              >
                <span className="max-w-[14rem] truncate">{l.name}</span>
                {count ? (
                  <span className="tabular text-caption text-ink-500">{count}</span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
