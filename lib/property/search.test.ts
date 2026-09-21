import { describe, it, expect } from 'vitest'
import { searchProperties, suggestRelaxations, activeFilterKeys, pricePerArea } from './search'
import { buildDemoProperties } from './demo-data'
import { emptyQuery, RESULTS_PER_PAGE, type SearchQuery } from '@/lib/search/query'
import type { PropertySummary } from './types'

const NOW = new Date('2026-09-21T00:00:00Z')
const CORPUS = buildDemoProperties(NOW)

const run = (patch: Partial<SearchQuery> = {}) =>
  searchProperties({ ...emptyQuery(), ...patch }, { now: NOW, corpus: CORPUS })

/** A tiny, fully-known corpus, so facet assertions can be exact. */
function tiny(): PropertySummary[] {
  const base = {
    cityName: 'Kolkata',
    areaUnit: 'sqft' as const,
    areaBasis: 'carpet' as const,
    bathrooms: 2,
    superArea: 1000,
    parkingSpaces: 1,
    amenities: [],
    constructionStatus: 'READY' as const,
    furnishing: 'UNFURNISHED' as const,
    sellerType: 'OWNER' as const,
    postedAt: '2026-09-20',
    photos: [{ id: 'm', url: null, alt: 'x' }],
  }
  const mk = (
    id: string,
    localitySlug: string,
    bedrooms: number,
    propertyType: PropertySummary['propertyType'],
    price: number,
  ): PropertySummary => ({
    ...base,
    id,
    publicId: id,
    slug: id,
    intent: 'buy',
    propertyType,
    title: id,
    localitySlug,
    localityName: localitySlug,
    price,
    bedrooms,
    carpetArea: 800,
  })
  return [
    mk('a', 'new-town', 2, 'APARTMENT', 4_000_000),
    mk('b', 'new-town', 3, 'APARTMENT', 6_000_000),
    mk('c', 'new-town', 3, 'VILLA', 9_000_000),
    mk('d', 'salt-lake', 2, 'APARTMENT', 5_000_000),
    mk('e', 'salt-lake', 4, 'APARTMENT', 12_000_000),
  ]
}
const TINY = tiny()
const runTiny = (patch: Partial<SearchQuery> = {}) =>
  searchProperties({ ...emptyQuery(), ...patch }, { now: NOW, corpus: TINY })

describe('filtering', () => {
  it('returns only the requested intent', () => {
    expect(run({ intent: 'rent' }).results.every((p) => p.intent === 'rent')).toBe(true)
    expect(run({ intent: 'buy' }).results.every((p) => p.intent === 'buy')).toBe(true)
  })

  it('treats multi-select within a facet as OR', () => {
    const out = runTiny({ bedrooms: [2, 4] })
    expect(out.results.map((p) => p.id).sort()).toEqual(['a', 'd', 'e'])
  })

  it('treats separate facets as AND', () => {
    const out = runTiny({ bedrooms: [3], propertyTypes: ['APARTMENT'] })
    expect(out.results.map((p) => p.id)).toEqual(['b'])
  })

  it('treats amenities as AND — asking for a lift and a gym means both', () => {
    const corpus = TINY.map((p, i) => ({
      ...p,
      amenities: i === 0 ? (['LIFT', 'GYM'] as const).slice() : i === 1 ? (['LIFT'] as const).slice() : [],
    }))
    const out = searchProperties(
      { ...emptyQuery(), amenities: ['LIFT', 'GYM'] },
      { now: NOW, corpus },
    )
    expect(out.results.map((p) => p.id)).toEqual(['a'])
  })

  it('excludes a listing whose age is unknown from an age ceiling', () => {
    const corpus = [
      { ...TINY[0]!, id: 'known', ageYears: 3 },
      { ...TINY[1]!, id: 'unknown', ageYears: undefined },
    ]
    const out = searchProperties({ ...emptyQuery(), ageMax: 5 }, { now: NOW, corpus })
    expect(out.results.map((p) => p.id)).toEqual(['known'])
  })

  it('excludes a listing with no floor from a floor range', () => {
    const corpus = [
      { ...TINY[0]!, id: 'has', floor: 3, totalFloors: 9 },
      { ...TINY[1]!, id: 'none', floor: undefined },
    ]
    const out = searchProperties({ ...emptyQuery(), floorMin: 1, floorMax: 5 }, { now: NOW, corpus })
    expect(out.results.map((p) => p.id)).toEqual(['has'])
  })

  it('applies a price range inclusively at both bounds', () => {
    const out = runTiny({ priceMin: 4_000_000, priceMax: 6_000_000 })
    expect(out.results.map((p) => p.id).sort()).toEqual(['a', 'b', 'd'])
  })
})

describe('facet counts use exclusion semantics', () => {
  it('counts a facet as if its own selection were not applied', () => {
    // Ticking 2 BHK must NOT collapse the other bedroom rows to zero —
    // they have to keep saying what ticking them too would give you.
    const out = runTiny({ bedrooms: [2] })
    expect(out.total).toBe(2)
    expect(out.facets.bedrooms.get(2)).toBe(2)
    expect(out.facets.bedrooms.get(3)).toBe(2)
    expect(out.facets.bedrooms.get(4)).toBe(1)
  })

  it('still applies OTHER facets to a facet own count', () => {
    // New Town only. Bedroom counts must reflect that, but not the
    // bedroom selection itself.
    const out = runTiny({ localities: ['new-town'], bedrooms: [2] })
    expect(out.total).toBe(1)
    expect(out.facets.bedrooms.get(2)).toBe(1)
    expect(out.facets.bedrooms.get(3)).toBe(2)
    expect(out.facets.bedrooms.get(4)).toBeUndefined()
  })

  it('counts localities without applying the locality selection', () => {
    const out = runTiny({ localities: ['new-town'] })
    expect(out.facets.localities.get('new-town')).toBe(3)
    expect(out.facets.localities.get('salt-lake')).toBe(2)
  })

  it('narrows a locality facet by a bedroom selection', () => {
    const out = runTiny({ bedrooms: [3] })
    expect(out.facets.localities.get('new-town')).toBe(2)
    expect(out.facets.localities.get('salt-lake')).toBeUndefined()
  })

  it('counts boolean facets as "how many would survive turning this on"', () => {
    const corpus = TINY.map((p, i) => ({ ...p, photos: i < 3 ? p.photos : [] }))
    const out = searchProperties({ ...emptyQuery(), withPhotosOnly: true }, { now: NOW, corpus })
    expect(out.total).toBe(3)
    expect(out.facets.withPhotos).toBe(3)
  })

  it('counts budget bands without applying the budget', () => {
    const out = runTiny({ priceMin: 8_000_000 })
    // Bands: <=25L, 25-50L, 50-75L, 75L-1Cr, 1-2Cr, >2Cr
    expect(out.total).toBe(2)
    expect(out.facets.budgetBands[1]).toBe(2) // 40L and 50L — bands share a boundary
    expect(out.facets.budgetBands[2]).toBe(2) // 50L and 60L
    expect(out.facets.budgetBands[4]).toBe(1) // 1.2Cr
  })

  it('never counts across intents', () => {
    const out = run({ intent: 'rent' })
    const rentTotal = CORPUS.filter((p) => p.intent === 'rent').length
    expect([...out.facets.localities.values()].reduce((a, b) => a + b, 0)).toBe(rentTotal)
  })
})

describe('sorting', () => {
  it('orders price ascending and descending', () => {
    const asc = run({ sort: 'price_asc' }).results.map((p) => p.price)
    expect(asc).toEqual([...asc].sort((a, b) => a - b))
    const desc = run({ sort: 'price_desc' }).results.map((p) => p.price)
    expect(desc).toEqual([...desc].sort((a, b) => b - a))
  })

  it('orders newest first', () => {
    const dates = run({ sort: 'newest' }).results.map((p) => p.postedAt)
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)))
  })

  it('orders largest area first', () => {
    const areas = run({ sort: 'area_desc' }).results.map((p) => p.carpetArea)
    expect(areas).toEqual([...areas].sort((a, b) => b - a))
  })

  it('orders cheapest per sqft first', () => {
    const psf = run({ sort: 'psf_asc' }).results.map(pricePerArea)
    expect(psf).toEqual([...psf].sort((a, b) => a - b))
  })

  it('puts listings with photos above listings without, under relevance', () => {
    const results = run({ sort: 'relevance' }).results
    const firstWithout = results.findIndex((p) => p.photos.length === 0)
    const lastWith = results.map((p) => p.photos.length > 0).lastIndexOf(true)
    if (firstWithout !== -1) expect(firstWithout).toBeGreaterThan(lastWith - 1)
  })

  it('is stable, so pagination never drops or repeats a listing', () => {
    const a = run({ sort: 'relevance' }).results.map((p) => p.id)
    const b = run({ sort: 'relevance' }).results.map((p) => p.id)
    expect(a).toEqual(b)
  })
})

describe('pagination', () => {
  it('reports a total across every page, not just this one', () => {
    const out = run()
    expect(out.total).toBeGreaterThan(out.results.length)
    expect(out.results.length).toBe(RESULTS_PER_PAGE)
  })

  it('covers the whole set with no gaps and no repeats', () => {
    const first = run()
    const seen: string[] = []
    for (let page = 1; page <= first.pageCount; page++) {
      seen.push(...run({ page }).results.map((p) => p.id))
    }
    expect(seen.length).toBe(first.total)
    expect(new Set(seen).size).toBe(first.total)
  })

  it('clamps a page beyond the end instead of returning nothing', () => {
    const out = run({ page: 999 })
    expect(out.page).toBe(out.pageCount)
    expect(out.results.length).toBeGreaterThan(0)
  })
})

describe('zero results', () => {
  const impossible: Partial<SearchQuery> = {
    localities: ['howrah'],
    propertyTypes: ['VILLA'],
    bedrooms: [5],
    priceMax: 1_600_000,
    amenities: ['SWIMMING_POOL'],
  }

  it('returns nothing rather than quietly widening the search', () => {
    const out = run(impossible)
    expect(out.total).toBe(0)
    expect(out.results).toEqual([])
  })

  it('offers relaxations ranked by how much each one unlocks', () => {
    // Salt Lake has no 3 BHK, so this is one filter too many — and the
    // known corpus makes the exact ranking checkable.
    const out = runTiny({ localities: ['salt-lake'], bedrooms: [3], propertyTypes: ['APARTMENT'] })
    expect(out.total).toBe(0)
    expect(out.relaxations).toEqual([
      { key: 'bhk', label: 'bedrooms', resultsIfDropped: 2 },
      { key: 'locality', label: 'locality', resultsIfDropped: 1 },
    ])
    // Dropping property type alone rescues nothing, so it is not offered.
    expect(out.relaxations.map((r) => r.key)).not.toContain('type')
  })

  it('returns no relaxation rather than a useless one when no single drop helps', () => {
    const out = run(impossible)
    expect(out.relaxations).toEqual([])
    // and still hands the UI something real to offer instead
    expect(out.totalUnfiltered).toBeGreaterThan(0)
  })

  it('counts nearby localities with every OTHER filter still applied', () => {
    const out = runTiny({ localities: ['new-town'], bedrooms: [4] })
    expect(out.total).toBe(0)
    // Salt Lake has the only 4 BHK, so it is the one honest suggestion.
    expect(out.nearbyLocalities).toEqual([{ slug: 'salt-lake', count: 1 }])
  })

  it('never suggests a locality the user already selected', () => {
    const out = runTiny({ localities: ['new-town'], bedrooms: [4] })
    expect(out.nearbyLocalities.map((n) => n.slug)).not.toContain('new-town')
  })

  it('suggests only filters the user actually set', () => {
    const q = { ...emptyQuery(), ...impossible } as SearchQuery
    const active = activeFilterKeys(q)
    for (const r of suggestRelaxations(q, { now: NOW, corpus: CORPUS })) {
      expect(active).toContain(r.key)
    }
  })

  it('leaves relaxations empty when there are results', () => {
    expect(run().relaxations).toEqual([])
  })

  it('reports honest zeroes in the rail rather than pre-filter counts', () => {
    // With an impossible combination the other facets genuinely are zero.
    // Showing the unfiltered corpus here would promise results that do not
    // exist, which is the same lie as relaxing the filter silently.
    const out = run(impossible)
    expect([...out.facets.localities.values()].every((n) => n === 0)).toBe(true)
  })
})

describe('activeFilterKeys', () => {
  it('reports nothing for an untouched query', () => {
    expect(activeFilterKeys(emptyQuery())).toEqual([])
  })

  it('reports each dimension the user has set', () => {
    const keys = activeFilterKeys({
      ...emptyQuery(),
      localities: ['new-town'],
      bedrooms: [2],
      priceMax: 5_000_000,
      withPhotosOnly: true,
    })
    expect(keys.sort()).toEqual(['bhk', 'locality', 'photos', 'price'])
  })
})
