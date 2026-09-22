import { describe, it, expect } from 'vitest'
import { getSimilarProperties, SIMILAR_MINIMUM, SIMILAR_LIMIT } from './similar'
import { buildDemoProperties, toSummary } from './demo-data'
import type { PropertySummary } from './types'

const NOW = new Date('2026-09-22T00:00:00Z')
const CORPUS = buildDemoProperties(NOW).map(toSummary)
const detail = (id: string) => CORPUS.find((p) => p.id === id)!

/** A controlled pool, so tier boundaries can be asserted exactly. */
function make(
  id: string,
  over: Partial<PropertySummary> = {},
): PropertySummary {
  return {
    id,
    publicId: `p_${id}`,
    slug: id,
    intent: 'buy',
    propertyType: 'APARTMENT',
    title: id,
    localitySlug: 'new-town',
    localityName: 'New Town',
    cityName: 'Kolkata',
    price: 10_000_000,
    bedrooms: 3,
    bathrooms: 2,
    carpetArea: 1200,
    areaUnit: 'sqft',
    areaBasis: 'carpet',
    furnishing: 'UNFURNISHED',
    constructionStatus: 'READY',
    sellerType: 'OWNER',
    parkingSpaces: 1,
    amenities: [],
    postedAt: '2026-09-20',
    photos: [],
    ...over,
  }
}

describe('tier 1 — same locality, type, BHK, ±20%', () => {
  const subject = make('subject')
  const pool = [
    subject,
    make('a', { price: 9_000_000 }),
    make('b', { price: 11_000_000 }),
    make('c', { price: 12_000_000 }), // exactly +20%
    make('d', { price: 8_000_000 }), // exactly -20%
    make('far', { price: 13_000_000 }), // +30%, outside tier 1
  ]

  it('matches within the band and reports tier 1', () => {
    const out = getSimilarProperties(subject, { corpus: pool })
    expect(out.tier).toBe(1)
    expect(out.results.map((p) => p.id).sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('includes both band edges', () => {
    const ids = getSimilarProperties(subject, { corpus: pool }).results.map((p) => p.id)
    expect(ids).toContain('c')
    expect(ids).toContain('d')
  })

  it('never includes the subject itself', () => {
    const out = getSimilarProperties(subject, { corpus: pool })
    expect(out.results.map((p) => p.id)).not.toContain('subject')
  })

  it('never crosses intent', () => {
    const rentPool = [subject, ...['a', 'b', 'c', 'd'].map((id) => make(id, { intent: 'rent' }))]
    expect(getSimilarProperties(subject, { corpus: rentPool }).results).toEqual([])
  })

  it('never crosses property type or bedroom count', () => {
    const wrong = [
      subject,
      ...['a', 'b', 'c', 'd'].map((id) => make(id, { propertyType: 'VILLA' })),
      ...['e', 'f', 'g', 'h'].map((id) => make(id, { bedrooms: 2 })),
    ]
    expect(getSimilarProperties(subject, { corpus: wrong }).results).toEqual([])
  })
})

describe('tier 2 — adjacency, only where it is real', () => {
  it('uses sibling sub-localities when the subject is a sub-locality', () => {
    const subject = make('subject', { localitySlug: 'new-town-action-area-i' })
    const pool = [
      subject,
      ...['a', 'b', 'c', 'd'].map((id) => make(id, { localitySlug: 'new-town-action-area-ii' })),
    ]
    const out = getSimilarProperties(subject, { corpus: pool })
    expect(out.tier).toBe(2)
    expect(out.results).toHaveLength(4)
  })

  it('SKIPS tier 2 for a city-level locality rather than sweeping the city', () => {
    // Behala and New Town both hang off kolkata. They are not adjacent, and
    // treating them as siblings would return the whole city.
    const subject = make('subject', { localitySlug: 'new-town' })
    const pool = [subject, ...['a', 'b', 'c', 'd'].map((id) => make(id, { localitySlug: 'behala' }))]
    const out = getSimilarProperties(subject, { corpus: pool })
    expect(out.results).toEqual([])
    expect(out.tier).toBeNull()
  })
})

describe('tier 3 — widen the price band to ±35%', () => {
  it('reaches tier 3 when tier 1 cannot fill', () => {
    const subject = make('subject')
    const pool = [
      subject,
      ...['a', 'b', 'c', 'd'].map((id, i) => make(id, { price: 12_500_000 + i * 100_000 })),
    ]
    const out = getSimilarProperties(subject, { corpus: pool })
    expect(out.tier).toBe(3)
    expect(out.results).toHaveLength(4)
  })

  it('still excludes anything beyond ±35%', () => {
    const subject = make('subject')
    const pool = [subject, ...['a', 'b', 'c', 'd'].map((id) => make(id, { price: 20_000_000 }))]
    expect(getSimilarProperties(subject, { corpus: pool }).results).toEqual([])
  })
})

describe('the minimum', () => {
  it('shows nothing rather than three, and never pads', () => {
    const subject = make('subject')
    const pool = [subject, make('a'), make('b'), make('c')]
    const out = getSimilarProperties(subject, { corpus: pool })
    expect(out.results).toEqual([])
    expect(out.tier).toBeNull()
  })

  it('shows the section at exactly the minimum', () => {
    const subject = make('subject')
    const pool = [subject, make('a'), make('b'), make('c'), make('d')]
    expect(getSimilarProperties(subject, { corpus: pool }).results).toHaveLength(SIMILAR_MINIMUM)
  })

  it('caps the list so the scroller stays finite', () => {
    const subject = make('subject')
    const pool = [subject, ...Array.from({ length: 20 }, (_, i) => make(`x${i}`))]
    expect(getSimilarProperties(subject, { corpus: pool }).results).toHaveLength(SIMILAR_LIMIT)
  })
})

describe('ordering', () => {
  it('orders by recency, not by price proximity', () => {
    const subject = make('subject')
    const pool = [
      subject,
      make('old', { postedAt: '2026-08-01', price: 10_000_000 }),
      make('new', { postedAt: '2026-09-21', price: 11_900_000 }),
      make('mid', { postedAt: '2026-09-10' }),
      make('older', { postedAt: '2026-07-01' }),
    ]
    const ids = getSimilarProperties(subject, { corpus: pool }).results.map((p) => p.id)
    expect(ids).toEqual(['new', 'mid', 'old', 'older'])
  })

  it('is stable across calls', () => {
    const subject = detail('demo-1')
    const a = getSimilarProperties(subject, { corpus: CORPUS }).results.map((p) => p.id)
    const b = getSimilarProperties(subject, { corpus: CORPUS }).results.map((p) => p.id)
    expect(a).toEqual(b)
  })
})

describe('against the real fixture', () => {
  it('omits the section for the deliberately thin listing', () => {
    // demo-9 is a 5 BHK house in Howrah, the thinnest locality in the
    // fixture. It exists so this path is reachable.
    const out = getSimilarProperties(detail('demo-9'), { corpus: CORPUS })
    expect(out.results).toEqual([])
    expect(out.tier).toBeNull()
  })

  it('never returns a listing from another intent or locality set', () => {
    for (const p of CORPUS) {
      const out = getSimilarProperties(p, { corpus: CORPUS })
      for (const r of out.results) {
        expect(r.intent).toBe(p.intent)
        expect(r.bedrooms).toBe(p.bedrooms)
        expect(r.propertyType).toBe(p.propertyType)
        expect(r.id).not.toBe(p.id)
      }
    }
  })
})
