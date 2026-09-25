import { describe, it, expect } from 'vitest'
import { getListingCount, getListingCountsByLocality, getListingCountsByType, getRecentListings } from './queries'
import { searchProperties } from './search'
import { PROPERTY_TYPE_ORDER } from './types'
import { emptyQuery, type SearchQuery } from '@/lib/search/query'

/**
 * The homepage prints these numbers on its tiles and its "see all" cards,
 * and each one links to a results page that prints its own. They must be
 * the same number, or the page claims inventory it cannot show.
 */
const total = (patch: Partial<SearchQuery>, intent: 'buy' | 'rent' = 'buy') =>
  searchProperties({ ...emptyQuery(intent), ...patch }).total

describe('inventory counts', () => {
  it('counts each property type exactly as its results page does', () => {
    for (const intent of ['buy', 'rent'] as const) {
      const counts = getListingCountsByType(intent)
      for (const type of PROPERTY_TYPE_ORDER) {
        expect(counts.get(type) ?? 0).toBe(total({ propertyTypes: [type] }, intent))
      }
    }
  })

  it('counts each locality exactly as its results page does', () => {
    const counts = getListingCountsByLocality('buy')
    expect(counts.size).toBeGreaterThan(0)
    for (const [slug, n] of counts) expect(n).toBe(total({ localities: [slug] }))
  })

  it('never records a zero, so an empty type or place reads as absent rather than "0"', () => {
    for (const counts of [getListingCountsByType('buy'), getListingCountsByType('rent'), getListingCountsByLocality('buy')]) {
      expect([...counts.values()].every((n) => n > 0)).toBe(true)
    }
  })

  it('adds up to the total for the intent, which is what the results page shows', () => {
    for (const intent of ['buy', 'rent'] as const) {
      const sum = [...getListingCountsByType(intent).values()].reduce((a, b) => a + b, 0)
      expect(sum).toBe(getListingCount(intent))
      expect(getListingCount(intent)).toBe(total({}, intent))
    }
  })
})

describe('getRecentListings', () => {
  it('returns the newest first, within the limit, for the intent asked', () => {
    const rows = getRecentListings({ intent: 'rent', limit: 5 })
    expect(rows.length).toBeLessThanOrEqual(5)
    expect(rows.every((p) => p.intent === 'rent')).toBe(true)
    const dates = rows.map((p) => p.postedAt)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it('can insist on a photo, and on no cover photo appearing twice', () => {
    const rows = getRecentListings({ intent: 'buy', limit: 8, withPhotos: true, distinctPhotos: true })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((p) => p.photos.length > 0)).toBe(true)
    const covers = rows.map((p) => p.photos[0]?.url)
    expect(new Set(covers).size).toBe(covers.length)
  })
})
