import { describe, expect, it } from 'vitest'
import { listingBadges } from './badges'

const DAY = 86_400_000
const listing = (over: Partial<Parameters<typeof listingBadges>[0]> = {}) => ({
  postedAt: new Date(Date.now() - 30 * DAY).toISOString(),
  isPriceReduced: false,
  constructionStatus: 'READY' as 'READY' | 'UNDER_CONSTRUCTION',
  ...over,
})

describe('listingBadges (UI-06)', () => {
  it('shows only facts, in priority order: New, then Price reduced', () => {
    expect(listingBadges(listing())).toEqual([])
    expect(listingBadges(listing({ postedAt: new Date().toISOString(), isPriceReduced: true })).map((b) => b.label)).toEqual(['New', 'Price reduced'])
  })

  it('adds Under construction only for the browsing card, and never more than two', () => {
    const uc = listing({ constructionStatus: 'UNDER_CONSTRUCTION', isPriceReduced: true })
    expect(listingBadges(uc).map((b) => b.label)).toEqual(['Price reduced'])
    expect(listingBadges(uc, { construction: true }).map((b) => b.label)).toEqual(['Price reduced', 'Under construction'])
    const all = listing({ postedAt: new Date().toISOString(), isPriceReduced: true, constructionStatus: 'UNDER_CONSTRUCTION' })
    expect(listingBadges(all, { construction: true }).map((b) => b.label)).toEqual(['New', 'Price reduced'])
  })
})
