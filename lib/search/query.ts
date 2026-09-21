import type {
  AmenityCode,
  ConstructionStatus,
  Facing,
  Furnishing,
  Intent,
  PropertyTypeCode,
  SellerType,
} from '@/lib/property/types'

/**
 * The normalised search query — the single source of truth for the whole
 * results experience.
 *
 * Every surface resolves to this one shape: the homepage search, the
 * indexable landing routes, the desktop rail, the mobile sheet and the
 * active-filter chips. There is no component state mirroring a filter, so
 * nothing can drift out of sync with the address bar. A state change IS a
 * URL change, which is what makes back, forward, refresh, and a pasted link
 * behave identically without any of them being special-cased.
 *
 * Route grammar (approved in Phase 0):
 *   /buy/{city}
 *   /buy/{city}/{locality}
 *   /buy/{city}/{filter-slug}
 *   /buy/{city}/{locality}/{filter-slug}
 */

export type SortKey = 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'area_desc' | 'psf_asc'
export type PostedSince = '1d' | '7d' | '30d'

export type SearchQuery = {
  intent: Intent
  city: string
  /** Locality slugs. Multi-select — people search several at once. */
  localities: string[]
  propertyTypes: PropertyTypeCode[]
  /** Integer rupees. Sale price, or monthly rent when intent is 'rent'. */
  priceMin?: number
  priceMax?: number
  bedrooms: number[]
  /** A minimum, not a set: nobody wants "exactly 2 bathrooms". */
  bathroomsMin?: number
  /** Carpet sqft. Carpet, never super — comparing the two is the trap. */
  areaMin?: number
  areaMax?: number
  /** Rupees per carpet sqft, as a ceiling. */
  psfMax?: number
  furnishing: Furnishing[]
  construction?: ConstructionStatus
  /** Years since completion, as a ceiling. */
  ageMax?: number
  floorMin?: number
  floorMax?: number
  facing: Facing[]
  /** Minimum parking spaces. 1 means "must have parking". */
  parkingMin?: number
  amenities: AmenityCode[]
  sellerTypes: SellerType[]
  postedSince?: PostedSince
  withPhotosOnly?: boolean
  priceReducedOnly?: boolean
  /** Rent only: available on or before this ISO date. */
  availableBy?: string
  sort: SortKey
  /** 1-based. Page 1 is never written to the URL. */
  page: number
}

export const SORT_LABEL: Record<SortKey, string> = {
  relevance: 'Most relevant',
  newest: 'Newest first',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  area_desc: 'Area: largest first',
  psf_asc: 'Price per sqft: low to high',
}

export const SORT_ORDER: SortKey[] = [
  'relevance',
  'newest',
  'price_asc',
  'price_desc',
  'area_desc',
  'psf_asc',
]

export const POSTED_SINCE_LABEL: Record<PostedSince, string> = {
  '1d': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
}

export const RESULTS_PER_PAGE = 24

export function emptyQuery(intent: Intent = 'buy', city = 'kolkata'): SearchQuery {
  return {
    intent,
    city,
    localities: [],
    propertyTypes: [],
    bedrooms: [],
    furnishing: [],
    facing: [],
    amenities: [],
    sellerTypes: [],
    sort: 'relevance',
    page: 1,
  }
}

/* ------------------------------------------------------------------ *
 * Landing slugs
 *
 * A deliberately CLOSED set. These are the filter combinations that earn
 * their own indexable page; everything else lives in the query string.
 * Minting a page per filter combination is the thin-content trap the plan
 * forbids, so the registry is a list, not a grammar.
 * ------------------------------------------------------------------ */

type SlugPatch = Partial<SearchQuery>

export const FILTER_SLUGS: Record<string, { label: string; patch: SlugPatch }> = {
  '1-bhk': { label: '1 BHK', patch: { bedrooms: [1] } },
  '2-bhk': { label: '2 BHK', patch: { bedrooms: [2] } },
  '3-bhk': { label: '3 BHK', patch: { bedrooms: [3] } },
  '4-bhk': { label: '4 BHK', patch: { bedrooms: [4] } },
  flats: { label: 'Flats', patch: { propertyTypes: ['APARTMENT'] } },
  'independent-houses': { label: 'Independent houses', patch: { propertyTypes: ['INDEPENDENT_HOUSE'] } },
  'builder-floors': { label: 'Builder floors', patch: { propertyTypes: ['BUILDER_FLOOR'] } },
  villas: { label: 'Villas', patch: { propertyTypes: ['VILLA'] } },
  'studio-apartments': { label: 'Studio apartments', patch: { propertyTypes: ['STUDIO'] } },
  'ready-to-move': { label: 'Ready to move', patch: { construction: 'READY' } },
  'under-construction': { label: 'Under construction', patch: { construction: 'UNDER_CONSTRUCTION' } },
  'owner-properties': { label: 'Owner properties', patch: { sellerTypes: ['OWNER'] } },
  furnished: { label: 'Furnished', patch: { furnishing: ['FURNISHED'] } },
  'with-parking': { label: 'With parking', patch: { parkingMin: 1 } },
  'under-25-lakh': { label: 'Under ₹25 L', patch: { priceMax: 2_500_000 } },
  'under-50-lakh': { label: 'Under ₹50 L', patch: { priceMax: 5_000_000 } },
  'under-1-crore': { label: 'Under ₹1 Cr', patch: { priceMax: 10_000_000 } },
  'above-1-crore': { label: 'Above ₹1 Cr', patch: { priceMin: 10_000_000 } },
}

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

/** A URLSearchParams, or Next's plain resolved searchParams object. */
export type RawParams = URLSearchParams | Record<string, string | string[] | undefined>

function readParam(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined
  const v = params[key]
  return Array.isArray(v) ? v[0] : v
}

/** Split a comma list, drop blanks, de-duplicate, preserve order. */
function list(raw: string | undefined): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  for (const part of raw.split(',')) {
    const t = part.trim()
    if (t) seen.add(t)
  }
  return [...seen]
}

/** Keep only values the domain actually allows. Junk in a URL is normal. */
function enumList<T extends string>(raw: string | undefined, allowed: readonly T[]): T[] {
  const ok = new Set<string>(allowed)
  return list(raw).filter((v): v is T => ok.has(v))
}

function intIn(raw: string | undefined, min: number, max: number): number | undefined {
  if (raw == null || raw.trim() === '') return undefined
  const n = Number(raw)
  if (!Number.isFinite(n)) return undefined
  const i = Math.trunc(n)
  return i >= min && i <= max ? i : undefined
}

const PROPERTY_TYPES = ['APARTMENT', 'INDEPENDENT_HOUSE', 'BUILDER_FLOOR', 'VILLA', 'STUDIO'] as const
const FURNISHINGS = ['UNFURNISHED', 'SEMI_FURNISHED', 'FURNISHED'] as const
const SELLER_TYPES = ['OWNER', 'AGENT', 'BUILDER'] as const
const FACINGS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
const AMENITY_CODES = [
  'LIFT', 'POWER_BACKUP', 'SECURITY', 'GYM', 'SWIMMING_POOL', 'CLUBHOUSE',
  'CHILDRENS_PLAY_AREA', 'GATED_COMMUNITY', 'WATER_SUPPLY_24X7', 'PARK',
] as const

/**
 * Turn a URL into a query.
 *
 * Total and forgiving: any segment or parameter that is not recognised is
 * dropped rather than thrown on. A hand-edited or stale URL must degrade to
 * a valid search, never to an error page.
 *
 * `isKnownLocality` is injected so this module stays pure and testable —
 * it must not reach into the location fixture itself.
 */
export function parseSearchQuery(input: {
  intent: string
  city: string
  segments?: string[]
  params?: RawParams
  isKnownLocality: (slug: string) => boolean
}): SearchQuery {
  const { city, segments = [], params = {}, isKnownLocality } = input
  const intent: Intent = input.intent === 'rent' ? 'rent' : 'buy'
  const q = emptyQuery(intent, city)

  // Path segments: at most one locality, then at most one landing slug.
  // Order is checked rather than assumed, so /buy/kolkata/3-bhk works.
  let slugSegment: string | undefined
  for (const seg of segments.slice(0, 2)) {
    if (!q.localities.length && isKnownLocality(seg)) q.localities = [seg]
    else if (!slugSegment && FILTER_SLUGS[seg]) slugSegment = seg
  }
  if (slugSegment) Object.assign(q, FILTER_SLUGS[slugSegment]!.patch)

  // Query parameters override a landing slug, because they are what the
  // user just changed by touching a control.
  const locParam = list(readParam(params, 'loc')).filter(isKnownLocality)
  if (locParam.length) q.localities = locParam

  const types = enumList(readParam(params, 'type'), PROPERTY_TYPES)
  if (types.length) q.propertyTypes = types

  const bhk = list(readParam(params, 'bhk'))
    .map((v) => intIn(v, 1, 9))
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b)
  if (bhk.length) q.bedrooms = bhk

  const furn = enumList(readParam(params, 'furn'), FURNISHINGS)
  if (furn.length) q.furnishing = furn

  const sellers = enumList(readParam(params, 'seller'), SELLER_TYPES)
  if (sellers.length) q.sellerTypes = sellers

  const facing = enumList(readParam(params, 'face'), FACINGS)
  if (facing.length) q.facing = facing

  const amenities = enumList(readParam(params, 'amen'), AMENITY_CODES)
  if (amenities.length) q.amenities = amenities

  const pmin = intIn(readParam(params, 'pmin'), 0, 10_000_000_000)
  const pmax = intIn(readParam(params, 'pmax'), 0, 10_000_000_000)
  if (pmin != null) q.priceMin = pmin
  if (pmax != null) q.priceMax = pmax

  const amin = intIn(readParam(params, 'amin'), 0, 1_000_000)
  const amax = intIn(readParam(params, 'amax'), 0, 1_000_000)
  if (amin != null) q.areaMin = amin
  if (amax != null) q.areaMax = amax

  const flmin = intIn(readParam(params, 'flmin'), 0, 200)
  const flmax = intIn(readParam(params, 'flmax'), 0, 200)
  if (flmin != null) q.floorMin = flmin
  if (flmax != null) q.floorMax = flmax

  const psfMax = intIn(readParam(params, 'psfmax'), 0, 1_000_000)
  if (psfMax != null) q.psfMax = psfMax

  const bath = intIn(readParam(params, 'bath'), 1, 9)
  if (bath != null) q.bathroomsMin = bath

  const age = intIn(readParam(params, 'age'), 0, 100)
  if (age != null) q.ageMax = age

  const park = intIn(readParam(params, 'park'), 0, 9)
  if (park != null) q.parkingMin = park

  const cons = readParam(params, 'cons')
  if (cons === 'READY' || cons === 'UNDER_CONSTRUCTION') q.construction = cons

  const since = readParam(params, 'since')
  if (since === '1d' || since === '7d' || since === '30d') q.postedSince = since

  if (readParam(params, 'photos') === '1') q.withPhotosOnly = true
  if (readParam(params, 'reduced') === '1') q.priceReducedOnly = true

  const by = readParam(params, 'by')
  if (by && /^\d{4}-\d{2}-\d{2}$/.test(by) && intent === 'rent') q.availableBy = by

  const sort = readParam(params, 'sort')
  if (sort && (SORT_ORDER as string[]).includes(sort)) q.sort = sort as SortKey

  q.page = intIn(readParam(params, 'page'), 1, 10_000) ?? 1

  // A reversed range is a typo, not an intent to match nothing. Swapping is
  // the only silent correction in here, and it never removes a constraint.
  if (q.priceMin != null && q.priceMax != null && q.priceMin > q.priceMax) {
    ;[q.priceMin, q.priceMax] = [q.priceMax, q.priceMin]
  }
  if (q.areaMin != null && q.areaMax != null && q.areaMin > q.areaMax) {
    ;[q.areaMin, q.areaMax] = [q.areaMax, q.areaMin]
  }
  if (q.floorMin != null && q.floorMax != null && q.floorMin > q.floorMax) {
    ;[q.floorMin, q.floorMax] = [q.floorMax, q.floorMin]
  }

  return q
}

/* ------------------------------------------------------------------ *
 * Serialising
 * ------------------------------------------------------------------ */

/** Everything except intent, city and a single locality, which live in the path. */
export function toSearchParams(q: SearchQuery, opts?: { omitLocalities?: boolean }): URLSearchParams {
  const p = new URLSearchParams()
  const setList = (key: string, xs: readonly (string | number)[]) => {
    if (xs.length) p.set(key, xs.join(','))
  }
  const setNum = (key: string, v: number | undefined) => {
    if (v != null) p.set(key, String(v))
  }

  if (!opts?.omitLocalities) setList('loc', q.localities)
  setList('type', q.propertyTypes)
  setList('bhk', [...q.bedrooms].sort((a, b) => a - b))
  setList('furn', q.furnishing)
  setList('seller', q.sellerTypes)
  setList('face', q.facing)
  setList('amen', q.amenities)
  setNum('pmin', q.priceMin)
  setNum('pmax', q.priceMax)
  setNum('amin', q.areaMin)
  setNum('amax', q.areaMax)
  setNum('psfmax', q.psfMax)
  setNum('bath', q.bathroomsMin)
  setNum('age', q.ageMax)
  setNum('flmin', q.floorMin)
  setNum('flmax', q.floorMax)
  setNum('park', q.parkingMin)
  if (q.construction) p.set('cons', q.construction)
  if (q.postedSince) p.set('since', q.postedSince)
  if (q.withPhotosOnly) p.set('photos', '1')
  if (q.priceReducedOnly) p.set('reduced', '1')
  if (q.availableBy && q.intent === 'rent') p.set('by', q.availableBy)
  if (q.sort !== 'relevance') p.set('sort', q.sort)
  if (q.page > 1) p.set('page', String(q.page))
  return p
}

/**
 * The canonical URL for a query.
 *
 * A single locality becomes a path segment, because that is the indexable,
 * shareable form. Several localities stay in the query string — there is no
 * sensible single page for "New Town or Salt Lake or Rajarhat".
 */
export function buildSearchUrl(
  input: Partial<SearchQuery> & { intent: Intent; city: string },
): string {
  // Accepts a partial so a link can name only what it constrains — the
  // footer should not have to spell out nine empty arrays to say
  // "2 BHK flats in Kolkata".
  const q: SearchQuery = { ...emptyQuery(input.intent, input.city), ...input }
  const single = q.localities.length === 1
  const segments = [q.intent, q.city]
  if (single) segments.push(q.localities[0]!)
  const qs = toSearchParams(q, { omitLocalities: single }).toString()
  return `/${segments.join('/')}${qs ? `?${qs}` : ''}`
}

/**
 * The URL for an indexable landing page.
 *
 * Separate from buildSearchUrl on purpose: this is what internal links and
 * the footer emit, and it only ever produces the pretty path form. An
 * interactive filter change goes through buildSearchUrl instead, so the
 * address bar never pretends a twelve-filter search is a landing page.
 */
export function buildLandingUrl(input: {
  intent: Intent
  city: string
  locality?: string
  slug?: keyof typeof FILTER_SLUGS | (string & {})
}): string {
  const segments: string[] = [input.intent, input.city]
  if (input.locality) segments.push(input.locality)
  if (input.slug && FILTER_SLUGS[input.slug]) segments.push(input.slug)
  return `/${segments.join('/')}`
}

/** Any filter change resets pagination — page 3 of the old result set is meaningless. */
export function withFilterChange(q: SearchQuery, patch: Partial<SearchQuery>): SearchQuery {
  return { ...q, ...patch, page: 1 }
}

/**
 * Budget bands, in integer rupees.
 *
 * Deliberately non-linear: most Kolkata sale inventory sits below ₹1 Cr, so
 * the low end gets far more resolution than a linear scale would give it.
 */
export const BUY_BUDGET_BANDS = [
  { label: 'Up to ₹25 L', min: undefined, max: 2_500_000 },
  { label: '₹25 L – ₹50 L', min: 2_500_000, max: 5_000_000 },
  { label: '₹50 L – ₹75 L', min: 5_000_000, max: 7_500_000 },
  { label: '₹75 L – ₹1 Cr', min: 7_500_000, max: 10_000_000 },
  { label: '₹1 Cr – ₹2 Cr', min: 10_000_000, max: 20_000_000 },
  { label: 'Above ₹2 Cr', min: 20_000_000, max: undefined },
] as const

export const RENT_BUDGET_BANDS = [
  { label: 'Up to ₹10,000', min: undefined, max: 10_000 },
  { label: '₹10,000 – ₹20,000', min: 10_000, max: 20_000 },
  { label: '₹20,000 – ₹35,000', min: 20_000, max: 35_000 },
  { label: '₹35,000 – ₹50,000', min: 35_000, max: 50_000 },
  { label: 'Above ₹50,000', min: 50_000, max: undefined },
] as const
