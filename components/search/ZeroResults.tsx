import Link from 'next/link'
import { buttonClassName } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchIcon } from '@/components/ui/icons'
import type { NearbyLocality, Relaxation } from '@/lib/property/search'
import { clearAllPatch } from '@/lib/search/describe'
import { buildSearchUrl, withFilterChange, type SearchQuery } from '@/lib/search/query'

/**
 * What to do when nothing matches.
 *
 * The governing rule: NOTHING here happens on its own. Every option is a
 * control the user presses. A marketplace that quietly drops the budget
 * filter to avoid showing an empty page teaches people that its filters are
 * decorative, and the cost of that lands on the day they actually need the
 * filter to be true.
 *
 * So the empty state says plainly that the filters are still applied, and
 * offers three explicit exits, in increasing order of how much they give up:
 *   1. remove one filter — each option states what it would return
 *   2. search the same thing somewhere else — counted WITH the other filters
 *   3. clear everything — the count is the whole city
 */
export function ZeroResults({
  query,
  relaxations,
  nearbyLocalities,
  totalUnfiltered,
  localityNames,
}: {
  query: SearchQuery
  relaxations: Relaxation[]
  nearbyLocalities: NearbyLocality[]
  totalUnfiltered: number
  localityNames: Record<string, string>
}) {
  // Every exit is a link to the search it leads to (UI-12), like the filter
  // chips and Clear all in the results header (UI-06): it works before and
  // without JavaScript, and nothing is disabled under a focused control
  // while the next page loads. These were buttons pushing the router and
  // disabled while pending, so a keyboard user lost focus and a visitor
  // without JavaScript got controls that did nothing.
  const href = (patch: Partial<SearchQuery>) => buildSearchUrl(withFilterChange(query, patch))
  const chip = 'inline-flex min-h-11 items-center gap-2 rounded-full border border-border-subtle bg-surface-000 py-1 pl-4 pr-1.5 text-body-sm text-ink-900 shadow-e1 transition-colors hover:border-brand-600 hover:bg-brand-50'

  const dropKeyPatch: Record<string, Partial<SearchQuery>> = {
    locality: { localities: [] },
    type: { propertyTypes: [] },
    bhk: { bedrooms: [] },
    price: { priceMin: undefined, priceMax: undefined },
    area: { areaMin: undefined, areaMax: undefined },
    psf: { psfMax: undefined },
    bath: { bathroomsMin: undefined },
    furnishing: { furnishing: [] },
    construction: { construction: undefined },
    age: { ageMax: undefined },
    floor: { floorMin: undefined, floorMax: undefined },
    facing: { facing: [] },
    parking: { parkingMin: undefined },
    amenities: { amenities: [] },
    seller: { sellerTypes: [] },
    postedSince: { postedSince: undefined },
    photos: { withPhotosOnly: undefined },
    reduced: { priceReducedOnly: undefined },
    availableBy: { availableBy: undefined },
  }

  const noun = query.intent === 'rent' ? 'rentals' : 'properties'
  const option = (label: string, count: number, to: string, wide?: boolean) => (
    <Link href={to} scroll={false} className={chip}>
      <span className={wide ? 'max-w-[12rem] truncate' : undefined}>{label}</span>
      <span className="grid h-7 min-w-7 place-items-center rounded-full bg-brand-50 px-2 text-caption font-semibold text-brand-700 tabular">
        {count.toLocaleString('en-IN')}
      </span>
    </Link>
  )

  return (
    <section aria-labelledby="zero-results">
      <EmptyState
        surface="card"
        headingId="zero-results"
        title={`No ${noun} match all of your filters`}
        icon={<SearchIcon />}
        action={
          <Link href={href(clearAllPatch())} scroll={false} className={buttonClassName({ variant: 'primary', className: 'rounded-full' })}>
            Clear all filters
            <span className="font-normal opacity-80 tabular">
              ({totalUnfiltered.toLocaleString('en-IN')})
            </span>
          </Link>
        }
      >
        <p className="max-w-2xl">
          Your filters are still applied — we have not changed them. Pick one of the options below,
          or remove a filter from the list above.
        </p>

        {relaxations.length > 0 && (
          <div className="mt-6">
            <h3 className="text-label text-ink-900">Remove one filter</h3>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {relaxations.slice(0, 5).map((r) => (
                <li key={r.key}>{option(`Without ${r.label}`, r.resultsIfDropped, href(dropKeyPatch[r.key] ?? {}))}</li>
              ))}
            </ul>
          </div>
        )}

        {nearbyLocalities.length > 0 && (
          <div className="mt-6">
            <h3 className="text-label text-ink-900">Try another locality</h3>
            <p className="mt-1 text-caption text-ink-500">
              Counted with the rest of your filters still applied.
            </p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {nearbyLocalities.map((l) => (
                <li key={l.slug}>{option(localityNames[l.slug] ?? l.slug, l.count, href({ localities: [l.slug] }), true)}</li>
              ))}
            </ul>
          </div>
        )}
      </EmptyState>
    </section>
  )
}
