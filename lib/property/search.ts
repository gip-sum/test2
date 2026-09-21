import { DEMO_PROPERTIES } from './demo-data'
import type {
  AmenityCode,
  ConstructionStatus,
  Facing,
  Furnishing,
  PropertySummary,
  PropertyTypeCode,
  SellerType,
} from './types'
import {
  BUY_BUDGET_BANDS,
  RENT_BUDGET_BANDS,
  RESULTS_PER_PAGE,
  type PostedSince,
  type SearchQuery,
} from '@/lib/search/query'

/**
 * Search, faceting and result assembly.
 *
 * Together with queries.ts this is the only module that knows where listing
 * data comes from. Phase 5 replaces the in-memory scan with SQL and a
 * GROUP BY per facet; the exported signatures do not change, so no route or
 * component is touched by that migration.
 *
 * The scan is O(filters × corpus) on purpose. At fixture size that is
 * nothing, and writing it as an honest predicate-per-filter keeps the
 * exclusion semantics below readable — which matters far more than speed
 * for code that is going to be replaced by a query planner anyway.
 */

/* ------------------------------------------------------------------ *
 * Predicates — one per filter, each independently testable.
 * ------------------------------------------------------------------ */

/** Identifies a filter so facet counting can exclude exactly one of them. */
export type FilterKey =
  | 'locality'
  | 'type'
  | 'bhk'
  | 'price'
  | 'area'
  | 'psf'
  | 'bath'
  | 'furnishing'
  | 'construction'
  | 'age'
  | 'floor'
  | 'facing'
  | 'parking'
  | 'amenities'
  | 'seller'
  | 'postedSince'
  | 'photos'
  | 'reduced'
  | 'availableBy'

export function pricePerArea(p: PropertySummary): number {
  return p.carpetArea > 0 ? p.price / p.carpetArea : Number.POSITIVE_INFINITY
}

function daysAgo(iso: string, now: Date): number {
  const then = Date.parse(`${iso}T00:00:00Z`)
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((today - then) / 86_400_000)
}

const SINCE_DAYS: Record<PostedSince, number> = { '1d': 1, '7d': 7, '30d': 30 }

/**
 * The predicate table.
 *
 * Every entry returns true when the filter is INACTIVE, so an unset filter
 * never removes anything. That convention is what lets the facet counter
 * below simply skip one key rather than rebuild the query.
 */
const PREDICATES: Record<
  FilterKey,
  (p: PropertySummary, q: SearchQuery, now: Date) => boolean
> = {
  locality: (p, q) => q.localities.length === 0 || q.localities.includes(p.localitySlug),
  type: (p, q) => q.propertyTypes.length === 0 || q.propertyTypes.includes(p.propertyType),
  bhk: (p, q) => q.bedrooms.length === 0 || q.bedrooms.includes(p.bedrooms),
  price: (p, q) =>
    (q.priceMin == null || p.price >= q.priceMin) && (q.priceMax == null || p.price <= q.priceMax),
  area: (p, q) =>
    (q.areaMin == null || p.carpetArea >= q.areaMin) &&
    (q.areaMax == null || p.carpetArea <= q.areaMax),
  psf: (p, q) => q.psfMax == null || pricePerArea(p) <= q.psfMax,
  bath: (p, q) => q.bathroomsMin == null || p.bathrooms >= q.bathroomsMin,
  furnishing: (p, q) => q.furnishing.length === 0 || q.furnishing.includes(p.furnishing),
  construction: (p, q) => q.construction == null || p.constructionStatus === q.construction,
  // A listing with no stated age cannot satisfy an age ceiling. Treating
  // unknown as "passes" would quietly show 30-year-old stock under
  // "up to 5 years", which is the kind of silent relaxation that destroys
  // trust in a filter.
  age: (p, q) => q.ageMax == null || (p.ageYears != null && p.ageYears <= q.ageMax),
  floor: (p, q) => {
    if (q.floorMin == null && q.floorMax == null) return true
    if (p.floor == null) return false
    return (q.floorMin == null || p.floor >= q.floorMin) && (q.floorMax == null || p.floor <= q.floorMax)
  },
  facing: (p, q) => q.facing.length === 0 || (p.facing != null && q.facing.includes(p.facing)),
  parking: (p, q) => q.parkingMin == null || p.parkingSpaces >= q.parkingMin,
  // AND, not OR: asking for a lift and a gym means both.
  amenities: (p, q) => q.amenities.every((a) => p.amenities.includes(a)),
  seller: (p, q) => q.sellerTypes.length === 0 || q.sellerTypes.includes(p.sellerType),
  postedSince: (p, q, now) =>
    q.postedSince == null || daysAgo(p.postedAt, now) <= SINCE_DAYS[q.postedSince],
  photos: (p, q) => !q.withPhotosOnly || p.photos.length > 0,
  reduced: (p, q) => !q.priceReducedOnly || p.isPriceReduced === true,
  availableBy: (p, q) =>
    q.availableBy == null || (p.availableFrom != null && p.availableFrom <= q.availableBy),
}

const ALL_KEYS = Object.keys(PREDICATES) as FilterKey[]

/** Intent and city are not filters — they select the corpus. */
function corpusFor(q: SearchQuery, all: PropertySummary[]): PropertySummary[] {
  return all.filter((p) => p.intent === q.intent)
}

function matches(p: PropertySummary, q: SearchQuery, now: Date, except?: FilterKey): boolean {
  for (const key of ALL_KEYS) {
    if (key === except) continue
    if (!PREDICATES[key](p, q, now)) return false
  }
  return true
}

/** Which filters the user has actually set. Drives chips and the reset link. */
export function activeFilterKeys(q: SearchQuery): FilterKey[] {
  const empty = { ...q } as SearchQuery
  return ALL_KEYS.filter((key) => {
    // A filter is active when removing it would change what it matches, which
    // is exactly "the predicate is not the trivially-true one".
    switch (key) {
      case 'locality': return q.localities.length > 0
      case 'type': return q.propertyTypes.length > 0
      case 'bhk': return q.bedrooms.length > 0
      case 'price': return q.priceMin != null || q.priceMax != null
      case 'area': return q.areaMin != null || q.areaMax != null
      case 'psf': return q.psfMax != null
      case 'bath': return q.bathroomsMin != null
      case 'furnishing': return q.furnishing.length > 0
      case 'construction': return q.construction != null
      case 'age': return q.ageMax != null
      case 'floor': return q.floorMin != null || q.floorMax != null
      case 'facing': return q.facing.length > 0
      case 'parking': return q.parkingMin != null
      case 'amenities': return q.amenities.length > 0
      case 'seller': return q.sellerTypes.length > 0
      case 'postedSince': return q.postedSince != null
      case 'photos': return q.withPhotosOnly === true
      case 'reduced': return q.priceReducedOnly === true
      case 'availableBy': return q.availableBy != null
      default: return Boolean(empty)
    }
  })
}

/* ------------------------------------------------------------------ *
 * Sorting
 * ------------------------------------------------------------------ */

function sortResults(rows: PropertySummary[], q: SearchQuery, now: Date): PropertySummary[] {
  const out = rows.slice()
  const byNewest = (a: PropertySummary, b: PropertySummary) =>
    b.postedAt.localeCompare(a.postedAt) || a.id.localeCompare(b.id)

  switch (q.sort) {
    case 'newest':
      return out.sort(byNewest)
    case 'price_asc':
      return out.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id))
    case 'price_desc':
      return out.sort((a, b) => b.price - a.price || a.id.localeCompare(b.id))
    case 'area_desc':
      return out.sort((a, b) => b.carpetArea - a.carpetArea || a.id.localeCompare(b.id))
    case 'psf_asc':
      return out.sort((a, b) => pricePerArea(a) - pricePerArea(b) || a.id.localeCompare(b.id))
    case 'relevance':
    default:
      /**
       * Relevance is defined, not magic: a listing you can actually judge
       * ranks above one you cannot, and fresher above staler. Anything more
       * clever here would be unexplainable to a seller asking why their
       * listing sits where it does.
       *
       * Ties break on id so the order is stable across renders — an
       * unstable sort makes pagination drop and repeat listings.
       */
      return out.sort((a, b) => {
        const photo = Number(b.photos.length > 0) - Number(a.photos.length > 0)
        if (photo) return photo
        const fresh = daysAgo(a.postedAt, now) - daysAgo(b.postedAt, now)
        if (fresh) return fresh
        return a.id.localeCompare(b.id)
      })
  }
}

/* ------------------------------------------------------------------ *
 * Facets
 * ------------------------------------------------------------------ */

export type Facets = {
  localities: Map<string, number>
  propertyTypes: Map<PropertyTypeCode, number>
  bedrooms: Map<number, number>
  furnishing: Map<Furnishing, number>
  construction: Map<ConstructionStatus, number>
  sellerTypes: Map<SellerType, number>
  facing: Map<Facing, number>
  amenities: Map<AmenityCode, number>
  postedSince: Map<PostedSince, number>
  /** Index into BUY_BUDGET_BANDS / RENT_BUDGET_BANDS for this intent. */
  budgetBands: number[]
  withPhotos: number
  priceReduced: number
  withParking: number
}

function tally<K>(rows: PropertySummary[], key: (p: PropertySummary) => K | undefined): Map<K, number> {
  const m = new Map<K, number>()
  for (const p of rows) {
    const k = key(p)
    if (k === undefined) continue
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

/**
 * Facet counts with EXCLUSION semantics.
 *
 * Within a facet, counts reflect every filter EXCEPT that facet's own
 * selection. This is the single detail that makes multi-select feel correct:
 * having ticked "2 BHK", the 3 BHK row must still show how many 3 BHK
 * listings you would get by also ticking it — not zero, and not the count
 * from an unfiltered corpus either.
 *
 * Ranges and booleans are counted the same way, so "with photos: 41" means
 * "41 of your current results would survive turning this on".
 */
function computeFacets(corpus: PropertySummary[], q: SearchQuery, now: Date): Facets {
  const except = (key: FilterKey) => corpus.filter((p) => matches(p, q, now, key))
  const bands = q.intent === 'rent' ? RENT_BUDGET_BANDS : BUY_BUDGET_BANDS
  const priceRows = except('price')

  return {
    localities: tally(except('locality'), (p) => p.localitySlug),
    propertyTypes: tally(except('type'), (p) => p.propertyType),
    bedrooms: tally(except('bhk'), (p) => p.bedrooms),
    furnishing: tally(except('furnishing'), (p) => p.furnishing),
    construction: tally(except('construction'), (p) => p.constructionStatus),
    sellerTypes: tally(except('seller'), (p) => p.sellerType),
    facing: tally(except('facing'), (p) => p.facing),
    // An amenity facet counts listings that HAVE each amenity, so a row is
    // "how many of these also have a gym" rather than a partition.
    amenities: (() => {
      const rows = except('amenities')
      const m = new Map<AmenityCode, number>()
      for (const p of rows) for (const a of p.amenities) m.set(a, (m.get(a) ?? 0) + 1)
      return m
    })(),
    postedSince: (() => {
      const rows = except('postedSince')
      const m = new Map<PostedSince, number>()
      for (const k of ['1d', '7d', '30d'] as PostedSince[]) {
        m.set(k, rows.filter((p) => daysAgo(p.postedAt, now) <= SINCE_DAYS[k]).length)
      }
      return m
    })(),
    budgetBands: bands.map(
      (b) =>
        priceRows.filter((p) => (b.min == null || p.price >= b.min) && (b.max == null || p.price <= b.max))
          .length,
    ),
    withPhotos: except('photos').filter((p) => p.photos.length > 0).length,
    priceReduced: except('reduced').filter((p) => p.isPriceReduced === true).length,
    withParking: except('parking').filter((p) => p.parkingSpaces >= 1).length,
  }
}

/* ------------------------------------------------------------------ *
 * Zero-result recovery
 * ------------------------------------------------------------------ */

/**
 * What a single filter is costing.
 *
 * Used only to SUGGEST. Nothing here is ever applied automatically: a filter
 * the user set stays set until the user removes it. Quietly widening a
 * search is how a marketplace ends up showing a ₹3 Cr villa to someone who
 * asked for a ₹40 L flat and then wonders why nobody trusts the filters.
 */
export type Relaxation = { key: FilterKey; label: string; resultsIfDropped: number }

const KEY_LABEL: Record<FilterKey, string> = {
  locality: 'locality',
  type: 'property type',
  bhk: 'bedrooms',
  price: 'budget',
  area: 'carpet area',
  psf: 'price per sqft',
  bath: 'bathrooms',
  furnishing: 'furnishing',
  construction: 'construction status',
  age: 'property age',
  floor: 'floor',
  facing: 'facing',
  parking: 'parking',
  amenities: 'amenities',
  seller: 'posted by',
  postedSince: 'posted within',
  photos: 'photos only',
  reduced: 'price reduced only',
  availableBy: 'available by',
}

export function suggestRelaxations(
  q: SearchQuery,
  options?: { now?: Date; corpus?: PropertySummary[] },
): Relaxation[] {
  const now = options?.now ?? new Date()
  const corpus = corpusFor(q, options?.corpus ?? DEMO_PROPERTIES)
  return activeFilterKeys(q)
    .map((key) => ({
      key,
      label: KEY_LABEL[key],
      resultsIfDropped: corpus.filter((p) => matches(p, q, now, key)).length,
    }))
    .filter((r) => r.resultsIfDropped > 0)
    .sort((a, b) => b.resultsIfDropped - a.resultsIfDropped)
}

/**
 * Where else the same search would find something.
 *
 * Counted with the locality filter removed but EVERY other filter still
 * applied, so "Salt Lake (7)" means seven listings that match everything
 * else the user asked for — not seven listings in Salt Lake. A count that
 * quietly ignored the other filters would send them to another empty page.
 *
 * Suggestion only. Nothing is applied until the user picks one.
 */
export type NearbyLocality = { slug: string; count: number }

export function suggestLocalities(
  q: SearchQuery,
  options?: { now?: Date; corpus?: PropertySummary[]; limit?: number },
): NearbyLocality[] {
  const now = options?.now ?? new Date()
  const corpus = corpusFor(q, options?.corpus ?? DEMO_PROPERTIES)
  const chosen = new Set(q.localities)
  const counts = new Map<string, number>()
  for (const p of corpus) {
    if (chosen.has(p.localitySlug)) continue
    if (!matches(p, q, now, 'locality')) continue
    counts.set(p.localitySlug, (counts.get(p.localitySlug) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
    .slice(0, options?.limit ?? 6)
}

/**
 * How many listings remain for the same place with NO filters at all.
 *
 * The last honest fallback for a search that nothing short of clearing it
 * can rescue. It is a number to show beside "Clear all filters", never an
 * action taken on the user's behalf.
 */
export function countWithoutFilters(
  q: SearchQuery,
  options?: { corpus?: PropertySummary[] },
): number {
  return corpusFor(q, options?.corpus ?? DEMO_PROPERTIES).length
}

/* ------------------------------------------------------------------ *
 * The search
 * ------------------------------------------------------------------ */

export type SearchOutcome = {
  results: PropertySummary[]
  /** Matches across every page, not just this one. */
  total: number
  page: number
  pageCount: number
  perPage: number
  facets: Facets
  /**
   * Populated only when total is 0. Every one of these is a SUGGESTION
   * rendered as a link the user chooses; none of them is ever applied
   * automatically. A filter the user set stays set until they remove it.
   */
  relaxations: Relaxation[]
  nearbyLocalities: NearbyLocality[]
  /** Listings for this intent with every filter cleared. */
  totalUnfiltered: number
}

export function searchProperties(
  q: SearchQuery,
  options?: { now?: Date; corpus?: PropertySummary[] },
): SearchOutcome {
  const now = options?.now ?? new Date()
  const corpus = corpusFor(q, options?.corpus ?? DEMO_PROPERTIES)

  const matched = corpus.filter((p) => matches(p, q, now))
  const sorted = sortResults(matched, q, now)

  const total = sorted.length
  const pageCount = Math.max(1, Math.ceil(total / RESULTS_PER_PAGE))
  // A page beyond the end is clamped rather than 404'd: it happens naturally
  // when a filter narrows the set while the user is deep in pagination.
  const page = Math.min(Math.max(1, q.page), pageCount)
  const start = (page - 1) * RESULTS_PER_PAGE

  return {
    results: sorted.slice(start, start + RESULTS_PER_PAGE),
    total,
    page,
    pageCount,
    perPage: RESULTS_PER_PAGE,
    facets: computeFacets(corpus, q, now),
    relaxations: total === 0 ? suggestRelaxations(q, { now, corpus: options?.corpus }) : [],
    nearbyLocalities:
      total === 0 && q.localities.length > 0
        ? suggestLocalities(q, { now, corpus: options?.corpus })
        : [],
    totalUnfiltered: corpus.length,
  }
}
