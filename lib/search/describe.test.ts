import { describe, it, expect } from 'vitest'
import { describeActiveFilters, describeSearch, clearAllPatch } from './describe'
import { emptyQuery, type SearchQuery } from './query'

const NAMES = new Map([
  ['new-town', 'New Town'],
  ['salt-lake', 'Salt Lake'],
  ['uttarpara-kotrung', 'Uttarpara Kotrung'],
])

describe('describeSearch', () => {
  it('describes a bare city search', () => {
    expect(describeSearch(emptyQuery(), 'Kolkata')).toBe('property for sale in Kolkata')
  })

  it('pluralises a property type properly, not by appending s', () => {
    const q = { ...emptyQuery(), propertyTypes: ['APARTMENT' as const] }
    expect(describeSearch(q, 'Kolkata')).toBe('flats / apartments for sale in Kolkata')
    const h = { ...emptyQuery(), propertyTypes: ['INDEPENDENT_HOUSE' as const] }
    expect(describeSearch(h, 'Kolkata')).toBe('independent houses for sale in Kolkata')
  })

  it('leaves "property" alone when several types are selected', () => {
    const q = { ...emptyQuery(), propertyTypes: ['APARTMENT' as const, 'VILLA' as const] }
    expect(describeSearch(q, 'Kolkata')).toBe('property for sale in Kolkata')
  })

  it('lists bedrooms in order and names every locality', () => {
    const q: SearchQuery = {
      ...emptyQuery(),
      bedrooms: [3, 2],
      propertyTypes: ['APARTMENT'],
      localities: ['uttarpara-kotrung', 'new-town'],
    }
    expect(describeSearch(q, 'Kolkata', NAMES)).toBe(
      '2, 3 BHK flats / apartments for sale in Uttarpara Kotrung, New Town',
    )
  })

  it('says for rent on a rental search', () => {
    expect(describeSearch(emptyQuery('rent'), 'Kolkata')).toBe('property for rent in Kolkata')
  })
})

describe('describeActiveFilters', () => {
  it('reports nothing for an untouched query', () => {
    expect(describeActiveFilters(emptyQuery())).toEqual([])
  })

  it('gives each multi-select value its own removable chip', () => {
    const q = { ...emptyQuery(), bedrooms: [2, 3] }
    const chips = describeActiveFilters(q)
    expect(chips.map((c) => c.label)).toEqual(['2 BHK', '3 BHK'])
    // Removing one leaves the other — the whole point of a per-value chip.
    expect(chips[0]!.remove).toEqual({ bedrooms: [3] })
    expect(chips[1]!.remove).toEqual({ bedrooms: [2] })
  })

  it('uses the locality display name, not the slug', () => {
    const q = { ...emptyQuery(), localities: ['uttarpara-kotrung'] }
    expect(describeActiveFilters(q, NAMES)[0]!.label).toBe('Uttarpara Kotrung')
  })

  it('collapses a range into one chip that clears both bounds', () => {
    const q = { ...emptyQuery(), priceMin: 5_000_000, priceMax: 10_000_000 }
    const [chip] = describeActiveFilters(q)
    expect(chip!.label).toBe('₹50 L – ₹1 Cr')
    expect(chip!.remove).toEqual({ priceMin: undefined, priceMax: undefined })
  })

  it('words a one-sided range as up to or above', () => {
    expect(describeActiveFilters({ ...emptyQuery(), priceMax: 2_500_000 })[0]!.label).toBe('Up to ₹25 L')
    expect(describeActiveFilters({ ...emptyQuery(), priceMin: 2_500_000 })[0]!.label).toBe('Above ₹25 L')
  })

  it('formats a rent range as rent, not as a sale price', () => {
    const q = { ...emptyQuery('rent'), priceMax: 20_000 }
    expect(describeActiveFilters(q)[0]!.label).toBe('Up to ₹20,000/mo')
  })

  it('gives every chip a unique key', () => {
    const q: SearchQuery = {
      ...emptyQuery(),
      localities: ['new-town', 'salt-lake'],
      bedrooms: [2, 3],
      propertyTypes: ['APARTMENT'],
      amenities: ['LIFT', 'GYM'],
      withPhotosOnly: true,
    }
    const ids = describeActiveFilters(q, NAMES).map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('clearAllPatch', () => {
  it('clears every filter', () => {
    const q: SearchQuery = {
      ...emptyQuery(),
      localities: ['new-town'],
      bedrooms: [2],
      priceMax: 5_000_000,
      amenities: ['LIFT'],
      withPhotosOnly: true,
      postedSince: '7d',
    }
    const cleared = { ...q, ...clearAllPatch() }
    expect(describeActiveFilters(cleared)).toEqual([])
  })

  it('keeps intent, city and sort, which are not filters', () => {
    const q: SearchQuery = { ...emptyQuery('rent'), sort: 'price_asc', localities: ['new-town'] }
    const cleared = { ...q, ...clearAllPatch() }
    expect(cleared.intent).toBe('rent')
    expect(cleared.city).toBe('kolkata')
    expect(cleared.sort).toBe('price_asc')
  })
})
