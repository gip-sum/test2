import { LAUNCH_CITY } from '@/lib/brand'
import { getCityLocalities, getPopularLocalities } from '@/lib/location/queries'
import { searchProperties } from '@/lib/property/search'
import { PROPERTY_TYPE_ORDER, PROPERTY_TYPE_PLURAL, type Intent, type PropertySummary, type PropertyTypeCode } from '@/lib/property/types'
import {
  BUY_BUDGET_BANDS, RENT_BUDGET_BANDS, buildLandingUrl, buildSearchUrl, emptyQuery, landingSlugFor, type SearchQuery,
} from '@/lib/search/query'

/**
 * What the homepage offers for discovery (Phase B): its collections and
 * every count on its tiles.
 *
 * Everything is computed through the search seam — the same function, with
 * the same query, that the linked results page runs — so a tile that says
 * "13" leads to a page that says 13, and stays true when the fixture
 * becomes a database. Nothing here is estimated, rounded or invented.
 *
 * A link exists only where its search has listings: a band, size or type
 * with nothing in it is left out rather than shown as a dead end. The one
 * exception is a popular locality with nothing at all, which keeps a single
 * "Explore" link — its results page recovers with nearby localities, and a
 * place missing from the list of popular places would read as broken.
 *
 * Links are landing URLs (buildLandingUrl) wherever a landing slug covers
 * the search, so the homepage points at indexable pages and does not mint
 * new ones. Only budget ranges without a landing page, and the collections'
 * "See all", use the results page's query-string form.
 *
 * Every function takes an optional corpus, so the empty and sparse states
 * can be tested; left out, the search seam uses the live inventory.
 */

type Options = { corpus?: PropertySummary[] }
const CITY = LAUNCH_CITY.slug

export type CountLink = { count: number; href: string }

function total(patch: Partial<SearchQuery> & { intent: Intent }, options?: Options): number {
  return searchProperties({ ...emptyQuery(patch.intent, CITY), ...patch }, { corpus: options?.corpus }).total
}

function linkFor(intent: Intent, patch: Partial<SearchQuery>, options?: Options): CountLink | null {
  const count = total({ intent, ...patch }, options)
  if (count === 0) return null
  const slug = landingSlugFor(patch)
  const href = slug ? buildLandingUrl({ intent, city: CITY, slug }) : buildSearchUrl({ intent, city: CITY, ...patch })
  return { count, href }
}

// ── Collections ─────────────────────────────────────────────────────────

export type CollectionId = 'new-sale' | 'new-rent' | 'reduced' | 'under-construction'

export type Collection = {
  id: CollectionId
  intent: Intent
  /** Up to eight, newest first, each with a photo. */
  listings: PropertySummary[]
  /** Every listing the "See all" page holds, photographed or not. */
  total: number
  href: string
}

const COLLECTIONS: Array<{ id: CollectionId; intent: Intent; patch: Partial<SearchQuery>; href: (q: SearchQuery) => string }> = [
  { id: 'new-sale', intent: 'buy', patch: {}, href: (q) => buildSearchUrl(q) },
  { id: 'new-rent', intent: 'rent', patch: {}, href: (q) => buildSearchUrl(q) },
  { id: 'reduced', intent: 'buy', patch: { priceReducedOnly: true }, href: (q) => buildSearchUrl(q) },
  // A landing page exists for this one; its results are in relevance order,
  // the rail shows the newest of them.
  { id: 'under-construction', intent: 'buy', patch: { construction: 'UNDER_CONSTRUCTION' }, href: () => buildLandingUrl({ intent: 'buy', city: CITY, slug: 'under-construction' }) },
]

/**
 * The homepage rails, in page order.
 *
 * A listing appears in one rail only — the first it qualifies for — and no
 * rail repeats a cover photo, because the same photo twice in one row reads
 * as a repost. Only listings with a photo go in a rail (a rail is a row of
 * pictures); the total still counts them all, as the "See all" page does.
 */
export function getHomeCollections(options?: Options & { perRail?: number }): Collection[] {
  const perRail = options?.perRail ?? 8
  const used = new Set<string>()
  return COLLECTIONS.map(({ id, intent, patch, href }) => {
    const query: SearchQuery = { ...emptyQuery(intent, CITY), ...patch, sort: 'newest' }
    const covers = new Set<string>()
    const listings: PropertySummary[] = []
    let page = 1
    let pageCount = 1
    let found = 0
    do {
      const outcome = searchProperties({ ...query, page }, { corpus: options?.corpus })
      pageCount = outcome.pageCount
      found = outcome.total
      for (const p of outcome.results) {
        const cover = p.photos[0]?.url
        if (listings.length >= perRail || !cover || used.has(p.id) || covers.has(cover)) continue
        covers.add(cover)
        listings.push(p)
      }
      page++
    } while (listings.length < perRail && page <= pageCount)
    for (const p of listings) used.add(p.id)
    return { id, intent, listings, total: found, href: href(query) }
  })
}

// ── Localities ──────────────────────────────────────────────────────────

export type LocalityTile = {
  slug: string
  name: string
  forSale: CountLink | null
  toRent: CountLink | null
}

export function getLocalityDiscovery(options?: Options): { popular: LocalityTile[]; all: Array<{ name: string; href: string }> } {
  const popular = getPopularLocalities().map((l) => {
    const count = (intent: Intent): CountLink | null => {
      const n = total({ intent, localities: [l.slug] }, options)
      return n ? { count: n, href: buildLandingUrl({ intent, city: CITY, locality: l.slug }) } : null
    }
    return { slug: l.slug, name: l.name, forSale: count('buy'), toRent: count('rent') }
  })
  const all = getCityLocalities().map((l) => ({ name: l.name, href: buildLandingUrl({ intent: 'buy', city: CITY, locality: l.slug }) }))
  return { popular, all }
}

/** Where a locality tile with nothing listed sends people: its sale results, which suggest nearby places. */
export const localityExploreHref = (slug: string) => buildLandingUrl({ intent: 'buy', city: CITY, locality: slug })

// ── Property types ──────────────────────────────────────────────────────

export type TypeTile = { type: PropertyTypeCode; label: string; forSale: CountLink | null; toRent: CountLink | null }

/** Supported types with something listed, for sale or to rent. Types with nothing either way are left out. */
export function getTypeDiscovery(options?: Options): TypeTile[] {
  return PROPERTY_TYPE_ORDER.map((type) => ({
    type,
    label: PROPERTY_TYPE_PLURAL[type],
    forSale: linkFor('buy', { propertyTypes: [type] }, options),
    toRent: linkFor('rent', { propertyTypes: [type] }, options),
  })).filter((t) => t.forSale || t.toRent)
}

// ── Budget and size ─────────────────────────────────────────────────────

export type BandTile = { label: string; count: number; href: string }

export function getBudgetDiscovery(options?: Options): Record<Intent, BandTile[]> {
  const bands = (intent: Intent, list: ReadonlyArray<{ label: string; min?: number; max?: number }>) =>
    list.flatMap((b) => {
      const link = linkFor(intent, { priceMin: b.min, priceMax: b.max }, options)
      return link ? [{ label: b.label, ...link }] : []
    })
  return { buy: bands('buy', BUY_BUDGET_BANDS), rent: bands('rent', RENT_BUDGET_BANDS) }
}

const SIZES = [1, 2, 3, 4] as const

export function getSizeDiscovery(options?: Options): Record<Intent, BandTile[]> {
  const sizes = (intent: Intent) =>
    SIZES.flatMap((n) => {
      const link = linkFor(intent, { bedrooms: [n] }, options)
      return link ? [{ label: `${n} BHK`, ...link }] : []
    })
  return { buy: sizes('buy'), rent: sizes('rent') }
}

/** These tiles and their URLs use the same query, so counts cannot drift. */
export function getSellerDiscovery(options?: Options): BandTile[] {
  return (['AGENT', 'OWNER', 'BUILDER'] as const).flatMap((seller) => {
    const link = linkFor('buy', { sellerTypes: [seller] }, options)
    return link ? [{ label: seller === 'AGENT' ? 'Dealer' : seller === 'OWNER' ? 'Owner' : 'Builder', ...link }] : []
  })
}

export function getPossessionDiscovery(options?: Options): BandTile[] {
  return (['READY', 'UNDER_CONSTRUCTION'] as const).flatMap((construction) => {
    const link = linkFor('buy', { construction }, options)
    return link ? [{ label: construction === 'READY' ? 'Ready to move' : 'Under construction', ...link }] : []
  })
}
