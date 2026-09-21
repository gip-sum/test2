import { describe, it, expect } from 'vitest'
import {
  buildSearchUrl,
  buildLandingUrl,
  emptyQuery,
  parseSearchQuery,
  toSearchParams,
  withFilterChange,
  type SearchQuery,
} from './query'

const EMPTY_QUERY = emptyQuery()
const KNOWN = new Set(['new-town', 'salt-lake', 'rajarhat', 'ballygunge', 'action-area-i'])
const isKnownLocality = (s: string) => KNOWN.has(s)

/** Parse a built URL straight back, the way a page load would. */
function roundTrip(q: SearchQuery): SearchQuery {
  const url = new URL(buildSearchUrl(q), 'https://example.invalid')
  const [, intent, city, ...segments] = url.pathname.split('/')
  return parseSearchQuery({
    intent: intent!,
    city: city!,
    segments,
    params: url.searchParams,
    isKnownLocality,
  })
}

describe('buildSearchUrl', () => {
  it('uses the bare city route when nothing is selected', () => {
    expect(buildSearchUrl(EMPTY_QUERY)).toBe('/buy/kolkata')
    expect(buildSearchUrl({ ...EMPTY_QUERY, intent: 'rent' })).toBe('/rent/kolkata')
  })

  it('promotes a single locality to a path segment — the indexable form', () => {
    expect(buildSearchUrl({ ...EMPTY_QUERY, localities: ['new-town'] })).toBe('/buy/kolkata/new-town')
  })

  it('keeps several localities in the query string, never as a path', () => {
    const url = buildSearchUrl({ ...EMPTY_QUERY, localities: ['new-town', 'salt-lake'] })
    expect(url).toBe('/buy/kolkata?loc=new-town%2Csalt-lake')
    expect(url).not.toContain('/new-town/salt-lake')
  })

  it('carries type, bhk and budget as parameters', () => {
    const url = buildSearchUrl({
      ...EMPTY_QUERY,
      localities: ['new-town'],
      propertyTypes: ['APARTMENT'],
      bedrooms: [3, 2],
      priceMin: 5_000_000,
      priceMax: 7_500_000,
    })
    expect(url).toContain('/buy/kolkata/new-town?')
    expect(url).toContain('type=APARTMENT')
    expect(url).toContain('bhk=2%2C3') // sorted, so the URL is stable
    expect(url).toContain('pmin=5000000')
    expect(url).toContain('pmax=7500000')
  })

  it('omits a bound that was not set', () => {
    const url = buildSearchUrl({ ...EMPTY_QUERY, priceMax: 2_500_000 })
    expect(url).toContain('pmax=2500000')
    expect(url).not.toContain('pmin')
  })

  it('produces the same URL for the same selection regardless of input order', () => {
    const a = buildSearchUrl({ ...EMPTY_QUERY, bedrooms: [3, 1, 2] })
    const b = buildSearchUrl({ ...EMPTY_QUERY, bedrooms: [1, 2, 3] })
    expect(a).toBe(b)
  })
})

describe('parseSearchQuery', () => {
  const parse = (path: string) => {
    const url = new URL(path, 'https://example.invalid')
    const [, intent, city, ...segments] = url.pathname.split('/')
    return parseSearchQuery({
      intent: intent!,
      city: city!,
      segments,
      params: url.searchParams,
      isKnownLocality,
    })
  }

  it('reads the bare city route', () => {
    const q = parse('/buy/kolkata')
    expect(q.intent).toBe('buy')
    expect(q.city).toBe('kolkata')
    expect(q.localities).toEqual([])
    expect(q.page).toBe(1)
    expect(q.sort).toBe('relevance')
  })

  it('treats an unknown intent as buy rather than failing', () => {
    expect(parse('/lease/kolkata').intent).toBe('buy')
  })

  it('reads a locality path segment', () => {
    expect(parse('/rent/kolkata/salt-lake').localities).toEqual(['salt-lake'])
  })

  it('reads a landing slug in the locality position', () => {
    const q = parse('/buy/kolkata/3-bhk')
    expect(q.bedrooms).toEqual([3])
    expect(q.localities).toEqual([])
  })

  it('reads locality and landing slug together', () => {
    const q = parse('/buy/kolkata/new-town/ready-to-move')
    expect(q.localities).toEqual(['new-town'])
    expect(q.construction).toBe('READY')
  })

  it('drops a path segment that is neither a locality nor a known slug', () => {
    const q = parse('/buy/kolkata/not-a-place/also-not-a-filter')
    expect(q.localities).toEqual([])
    expect(q.bedrooms).toEqual([])
  })

  it('lets query parameters override a landing slug', () => {
    // The slug says 3 BHK; the user then ticked 2 BHK in the rail.
    expect(parse('/buy/kolkata/3-bhk?bhk=2').bedrooms).toEqual([2])
  })

  it('drops unknown localities, enum values and out-of-range numbers', () => {
    const q = parse(
      '/buy/kolkata?loc=new-town,atlantis&type=APARTMENT,CASTLE&furn=FURNISHED,MARBLE' +
        '&bhk=3,99,abc&bath=0&age=999&sort=cheapest&page=0',
    )
    expect(q.localities).toEqual(['new-town'])
    expect(q.propertyTypes).toEqual(['APARTMENT'])
    expect(q.furnishing).toEqual(['FURNISHED'])
    expect(q.bedrooms).toEqual([3])
    expect(q.bathroomsMin).toBeUndefined()
    expect(q.ageMax).toBeUndefined()
    expect(q.sort).toBe('relevance')
    expect(q.page).toBe(1)
  })

  it('de-duplicates a repeated value', () => {
    expect(parse('/buy/kolkata?bhk=2,2,3').bedrooms).toEqual([2, 3])
  })

  it('swaps a reversed range instead of matching nothing', () => {
    const q = parse('/buy/kolkata?pmin=9000000&pmax=3000000')
    expect(q.priceMin).toBe(3_000_000)
    expect(q.priceMax).toBe(9_000_000)
  })

  it('ignores availableBy on a sale search, where it has no meaning', () => {
    expect(parse('/buy/kolkata?by=2026-10-01').availableBy).toBeUndefined()
    expect(parse('/rent/kolkata?by=2026-10-01').availableBy).toBe('2026-10-01')
  })

  it('reads every filter the rail can set', () => {
    const q = parse(
      '/rent/kolkata/new-town?type=APARTMENT&bhk=2,3&bath=2&pmin=10000&pmax=40000' +
        '&amin=600&amax=1800&psfmax=9000&furn=FURNISHED&cons=READY&age=10' +
        '&flmin=2&flmax=12&face=E,S&park=1&amen=LIFT,GYM&seller=OWNER,AGENT' +
        '&since=7d&photos=1&reduced=1&by=2026-10-15&sort=price_asc&page=3',
    )
    expect(q).toMatchObject({
      intent: 'rent',
      localities: ['new-town'],
      propertyTypes: ['APARTMENT'],
      bedrooms: [2, 3],
      bathroomsMin: 2,
      priceMin: 10_000,
      priceMax: 40_000,
      areaMin: 600,
      areaMax: 1800,
      psfMax: 9000,
      furnishing: ['FURNISHED'],
      construction: 'READY',
      ageMax: 10,
      floorMin: 2,
      floorMax: 12,
      facing: ['E', 'S'],
      parkingMin: 1,
      amenities: ['LIFT', 'GYM'],
      sellerTypes: ['OWNER', 'AGENT'],
      postedSince: '7d',
      withPhotosOnly: true,
      priceReducedOnly: true,
      availableBy: '2026-10-15',
      sort: 'price_asc',
      page: 3,
    })
  })
})

describe('URL round-trip', () => {
  it('survives a full query unchanged — this is what makes refresh and sharing work', () => {
    const q: SearchQuery = {
      ...emptyQuery('rent', 'kolkata'),
      localities: ['new-town', 'salt-lake'],
      propertyTypes: ['APARTMENT', 'STUDIO'],
      bedrooms: [1, 2],
      bathroomsMin: 2,
      priceMin: 12_000,
      priceMax: 38_000,
      areaMin: 500,
      areaMax: 1500,
      psfMax: 8000,
      furnishing: ['FURNISHED', 'SEMI_FURNISHED'],
      construction: 'READY',
      ageMax: 8,
      floorMin: 1,
      floorMax: 15,
      facing: ['E', 'NE'],
      parkingMin: 1,
      amenities: ['LIFT', 'SECURITY'],
      sellerTypes: ['OWNER'],
      postedSince: '30d',
      withPhotosOnly: true,
      priceReducedOnly: true,
      availableBy: '2026-11-01',
      sort: 'area_desc',
      page: 4,
    }
    expect(roundTrip(q)).toEqual(q)
  })

  it('survives a single-locality query, which travels as a path segment', () => {
    const q: SearchQuery = {
      ...emptyQuery('buy', 'kolkata'),
      localities: ['ballygunge'],
      bedrooms: [3],
      sort: 'price_desc',
    }
    expect(buildSearchUrl(q)).toContain('/buy/kolkata/ballygunge?')
    expect(roundTrip(q)).toEqual(q)
  })

  it('keeps an empty query as the clean city URL', () => {
    expect(roundTrip(emptyQuery())).toEqual(emptyQuery())
  })
})

describe('toSearchParams', () => {
  it('omits defaults, so a plain search has a clean URL', () => {
    expect(toSearchParams(emptyQuery()).toString()).toBe('')
  })

  it('omits page 1 and relevance sort', () => {
    const p = toSearchParams({ ...emptyQuery(), page: 1, sort: 'relevance' })
    expect(p.has('page')).toBe(false)
    expect(p.has('sort')).toBe(false)
  })
})

describe('withFilterChange', () => {
  it('resets to page 1, because page 3 of the old result set is meaningless', () => {
    const q = { ...emptyQuery(), page: 5 }
    expect(withFilterChange(q, { bedrooms: [2] }).page).toBe(1)
  })

  it('preserves sort across a filter change', () => {
    const q = { ...emptyQuery(), sort: 'price_asc' as const, page: 3 }
    expect(withFilterChange(q, { bedrooms: [2] }).sort).toBe('price_asc')
  })
})

describe('buildLandingUrl', () => {
  it('produces only the pretty path form', () => {
    expect(buildLandingUrl({ intent: 'buy', city: 'kolkata', locality: 'new-town', slug: '3-bhk' }))
      .toBe('/buy/kolkata/new-town/3-bhk')
    expect(buildLandingUrl({ intent: 'rent', city: 'kolkata' })).toBe('/rent/kolkata')
  })

  it('ignores a slug outside the closed set', () => {
    expect(buildLandingUrl({ intent: 'buy', city: 'kolkata', slug: '7-bhk-penthouse' }))
      .toBe('/buy/kolkata')
  })
})
