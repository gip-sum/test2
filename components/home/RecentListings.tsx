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
 * Full photograph cards on phones, a grid from tablet up.
 */
export function RecentListings() {
  const listings = getRecentListings({ limit: 3, withPhotos: true, distinctPhotos: true })

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-overline uppercase tracking-[0.14em] text-brand-600">Discover your next address</p>
          <h2 id="recent" className="mt-1 font-display text-heading-2 text-ink-900">
            Homes worth a closer look
          </h2>
          <p className="mt-2 text-body-sm text-ink-500">Explore the latest additions, then save the ones that feel right.</p>
        </div>
        <Link
          href={`/buy/${LAUNCH_CITY.slug}`}
          className="inline-flex min-h-11 items-center rounded-md text-label text-brand-600 hover:underline"
        >
          See all properties
        </Link>
      </div>

      <ul className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((property) => (
          <li key={property.id}>
            <PropertyCard property={property} />
          </li>
        ))}
      </ul>
    </section>
  )
}
