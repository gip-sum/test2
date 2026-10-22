import Link from 'next/link'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { EmptyState } from '@/components/ui/EmptyState'
import { CENTRE_ATTRIBUTION } from '@/lib/location/centres'
import { formatPrice, formatRent } from '@/lib/format/price'
import type { MapAreas } from '@/lib/search/areas'
import { buildSearchUrl, withFilterChange, type SearchQuery } from '@/lib/search/query'
import type { MapMarker } from './LocalityMap'
import { LazyLocalityMap } from './LazyLocalityMap'

const homes = (n: number) => `${n.toLocaleString('en-IN')} ${n === 1 ? 'home' : 'homes'}`

/**
 * The map view's side of Search (UI-21): the map, and under it the index
 * of every area in the results.
 *
 * The index is the map's equivalent: every area with its count, price span
 * and a link to its homes, in the HTML, so it works without JavaScript,
 * when the map cannot load, and for anyone who would rather read a list
 * than a map. Areas with no cited point are in it too, under "Not on the
 * map", and are never drawn somewhere they are not.
 *
 * Counts are of every match, not this page (lib/property/search.ts,
 * LocalityMatch). `onPage` says how many of this page's cards are in each
 * area, for the outline the map draws on them.
 */
export function SearchMap({ areas, query, onPage }: { areas: MapAreas; query: SearchQuery; onPage: Record<string, number> }) {
  const price = query.intent === 'rent' ? formatRent : formatPrice
  const markers: MapMarker[] = areas.placed.map((a) => ({
    slug: a.slug,
    name: a.name,
    lat: a.centre!.lat,
    lng: a.centre!.lng,
    count: a.count,
    minPrice: a.minPrice,
    maxPrice: a.maxPrice,
    members: a.members,
    label: `${a.name}: ${homes(a.count)}, from ${price(a.minPrice)}. Approximate area.`,
    onPage: onPage[a.slug] ?? 0,
  }))
  const total = areas.placedCount + areas.unplacedCount
  const href = (members: string[]) => buildSearchUrl(withFilterChange(query, { localities: members }))

  return (
    <section aria-labelledby="map-heading" className="search-map">
      <h2 id="map-heading" className="sr-only">Map of these results</h2>
      {markers.length > 0 ? (
        <LazyLocalityMap markers={markers} query={query} />
      ) : (
        <EmptyState surface="card" heading="h3" title="None of these areas is on the map yet">
          {homes(total)} match, in {areas.unplaced.length === 1 ? 'an area' : 'areas'} the map cannot place yet. They are all in the list.
        </EmptyState>
      )}
      {/* Without JavaScript the map cannot draw: the frame that would say
          "Loading" gives way to a sentence pointing at the index. */}
      <noscript>
        <style>{'.search-map .map-view{display:none}'}</style>
        <p className="text-body-sm text-ink-700">The map needs JavaScript. Every area is listed below, and every home is in the list.</p>
      </noscript>

      <div className="search-areas">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-display text-heading-3 text-ink-900">Areas in these results</h3>
          <p className="text-caption text-ink-700">
            {areas.unplacedCount > 0 ? `${homes(areas.placedCount)} of ${total.toLocaleString('en-IN')} on the map` : `All ${homes(total)} on the map`}
          </p>
        </div>
        <p className="mt-1 text-caption text-ink-500">Each marker is an area, not an address: homes are shown at their locality.</p>
        {areas.placed.length > 0 && <AreaList areas={areas.placed} intent={query.intent} href={href} />}
        {areas.unplaced.length > 0 && (
          <>
            <h4 className="mt-5 text-label font-semibold text-ink-900">Not on the map</h4>
            <p className="text-caption text-ink-700">These areas have no map position yet. Their homes are in the list.</p>
            <AreaList areas={areas.unplaced} intent={query.intent} href={href} />
          </>
        )}
        <p className="mt-4 text-caption text-ink-500">{CENTRE_ATTRIBUTION}.</p>
      </div>
    </section>
  )
}

function AreaList({ areas, intent, href }: { areas: MapAreas['placed']; intent: SearchQuery['intent']; href: (members: string[]) => string }) {
  return (
    <ul className="search-area-list">
      {areas.map((a) => (
        <li key={a.slug}>
          <Link href={href(a.members)} scroll={false} className="search-area-link" data-area-link={a.slug}>
            <span className="min-w-0 truncate font-semibold text-ink-900">{a.name}</span>
            <span className="search-area-count tabular">{homes(a.count)}</span>
            <span className="flex items-baseline gap-1 text-caption text-ink-700"><span>from</span><PriceDisplay amount={a.minPrice} intent={intent} className="[&_p]:text-body-sm" /></span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
