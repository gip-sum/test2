import Link from 'next/link'
import { buttonClassName } from '@/components/ui/Button'
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
  const chip = 'inline-flex min-h-11 items-center gap-2 rounded-full border border-border-subtle bg-surface-000 px-4 text-body-sm text-ink-900 hover:border-brand-600 hover:text-brand-600'

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

  return (
    <section
      aria-labelledby="zero-results"
      className="rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1 sm:p-6"
    >
      <h2 id="zero-results" className="font-display text-heading-3 text-ink-900">
        No {noun} match all of your filters
      </h2>
      <p className="mt-2 max-w-2xl text-body-sm text-ink-700">
        Your filters are still applied — we have not changed them. Pick one of the options below,
        or remove a filter from the list above.
      </p>

      {relaxations.length > 0 && (
        <div className="mt-5">
          <h3 className="text-label text-ink-900">Remove one filter</h3>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {relaxations.slice(0, 5).map((r) => (
              <li key={r.key}>
                <Link href={href(dropKeyPatch[r.key] ?? {})} scroll={false} className={chip}>
                  <span>Without {r.label}</span>
                  <span className="text-caption text-ink-500 tabular">
                    {r.resultsIfDropped.toLocaleString('en-IN')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nearbyLocalities.length > 0 && (
        <div className="mt-5">
          <h3 className="text-label text-ink-900">Try another locality</h3>
          <p className="mt-1 text-caption text-ink-500">
            Counted with the rest of your filters still applied.
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {nearbyLocalities.map((l) => (
              <li key={l.slug}>
                <Link href={href({ localities: [l.slug] })} scroll={false} className={chip}>
                  <span className="max-w-[12rem] truncate">{localityNames[l.slug] ?? l.slug}</span>
                  <span className="text-caption text-ink-500 tabular">
                    {l.count.toLocaleString('en-IN')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 border-t border-border-subtle pt-4">
        <Link href={href(clearAllPatch())} scroll={false} className={buttonClassName({ variant: 'primary' })}>
          Clear all filters
          <span className="font-normal opacity-80 tabular">
            ({totalUnfiltered.toLocaleString('en-IN')})
          </span>
        </Link>
      </div>
    </section>
  )
}
