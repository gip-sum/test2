import { describe, it, expect } from 'vitest'
import { buildSearchUrl, EMPTY_QUERY } from './query'

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
