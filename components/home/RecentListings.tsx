import Link from 'next/link'
import { PropertyCard } from '@/components/property/PropertyCard'
import { getRecentListings } from '@/lib/property/queries'
import { LAUNCH_CITY } from '@/lib/brand'

/**
 * Live inventory on the homepage.
 *
 * Two jobs: prove the catalogue is real, and show what a card looks like
 * before the visitor commits to a search. Sale and rent are mixed, ordered
 * by recency, because that is genuinely what "just added" means.
 *
 * Horizontal cards on phones, a grid from tablet up.
 */
export function RecentListings() {
  const listings = getRecentListings({ limit: 6 })

  if (listings.length === 0) {
    return (
      <section aria-labelledby="recent" className="rounded-lg border border-border-subtle bg-surface-000 p-6 text-center">
        <h2 id="recent" className="font-display text-heading-3 text-ink-900">
          No listings yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-500">
          Nothing has been posted in {LAUNCH_CITY.name} so far. If you have a property to sell or
          rent, yours can be the first.
        </p>
        <Link
          href="/post"
          className="mt-4 inline-flex h-11 items-center rounded-md bg-supply-600 px-5 text-label text-on-supply"
        >
          Post your property
        </Link>
      </section>
    )
  }

  return (
    <section aria-labelledby="recent">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="recent" className="font-display text-heading-3 text-ink-900">
          Recently added in {LAUNCH_CITY.name}
        </h2>
        <Link
          href={`/buy/${LAUNCH_CITY.slug}`}
          className="rounded-md text-label text-brand-600 hover:underline"
        >
          See all properties
        </Link>
      </div>

      {/* Horizontal on phones, vertical grid from md up — one component,
          two layouts, rather than two component trees. */}
      <ul className="mt-4 grid gap-3 md:hidden">
        {listings.map((p) => (
          <li key={p.id}>
            <PropertyCard property={p} layout="horizontal" />
          </li>
        ))}
      </ul>

      <ul className="mt-4 hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
        {listings.map((p, i) => (
          <li key={p.id}>
            <PropertyCard property={p} priority={i < 3} />
          </li>
        ))}
      </ul>
    </section>
  )
}
