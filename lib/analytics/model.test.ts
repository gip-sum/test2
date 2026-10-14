import { describe, it, expect } from 'vitest'
import type { PropertyCard } from '@/lib/dashboard/model'
import { addDays, buildPerformance, daysEnding, enquiryRate, niceMax, parseQuery, performanceHref, seriesFor, totals, type ActivityRow } from './model'

const L1 = 'd9140f33-a429-46f3-9514-000000000001', L2 = 'd9140f33-a429-46f3-9514-000000000002', L3 = 'd9140f33-a429-46f3-9514-000000000003'
const card = (id: string | null, status: PropertyCard['status'], title: string): PropertyCard => ({
  draftId: `c-${title}`, listing: id ? { id, version: 1, current_submission_id: 'e' } : null, status, title, intent: 'buy', price: 1, place: null,
  since: '2026-10-01', expiresAt: null, daysLeft: null, expiringSoon: false, rejectionReason: null, progress: null, detailsUnavailable: false, enquiries: null, activity: 0,
})
const row = (listing_id: string, day: string, views: number, enquiries = 0): ActivityRow => ({ listing_id, day, views, enquiries })

describe('dates', () => {
  it('steps across month and year ends without the server time zone', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(daysEnding('2026-10-14', 3)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14'])
  })
})

describe('series and totals', () => {
  const days = daysEnding('2026-10-14', 7)
  it('days before counting began are not tracked, never zero', () => {
    const s = seriesFor([row(L1, '2026-10-13', 4, 1), row(L1, '2026-10-09', 0, 2)], days, '2026-10-12')
    expect(s.map((p) => p.views)).toEqual([null, null, null, null, 0, 4, 0])
    expect(s.map((p) => p.enquiries)).toEqual([0, 2, 0, 0, 0, 1, 0])
    expect(totals(s)).toEqual({ views: 4, enquiries: 3, untrackedDays: 4 })
  })
  it('a wholly untracked period has unknown views, not zero', () => {
    expect(totals(seriesFor([], days, null)).views).toBeNull()
    expect(totals(seriesFor([], days, '2026-10-20')).views).toBeNull()
  })
  it('shows the enquiry rate only from 20 views', () => {
    expect(enquiryRate({ views: 19, enquiries: 3, untrackedDays: 0 })).toBeNull()
    expect(enquiryRate({ views: null, enquiries: 3, untrackedDays: 7 })).toBeNull()
    expect(enquiryRate({ views: 30, enquiries: 2, untrackedDays: 0 })).toBe(6.7)
  })
  it('chooses clean axis maxima', () => {
    expect([0, 1, 3, 7, 12, 99, 101].map(niceMax)).toEqual([1, 1, 5, 10, 20, 100, 200])
  })
})

describe('buildPerformance', () => {
  const cards = [card(L1, 'ACTIVE', 'Beta'), card(L2, 'WITHDRAWN', 'Alpha'), card(L3, 'REMOVED', 'Gone'), card(null, 'DRAFT', 'Private draft')]
  const activity = [row(L1, '2026-10-14', 10, 1), row(L1, '2026-10-05', 6, 1), row(L2, '2026-10-13', 10), row(L3, '2026-10-14', 50)]
  const result = buildPerformance({ cards, activity, saveCounts: [{ listing_id: L1, saves: 2 }], viewsSince: '2026-10-01', today: '2026-10-14', range: 7 })
  it('measures submitted listings only, never drafts or removed ones', () => {
    expect(result.map((r) => r.listingId)).toEqual([L2, L1])
  })
  it('sorts by views in the period, then by title', () => {
    expect(result.map((r) => r.card.title)).toEqual(['Alpha', 'Beta'])
  })
  it('compares with the previous period of the same length', () => {
    const beta = result.find((r) => r.listingId === L1)!
    expect(beta.current).toEqual({ views: 10, enquiries: 1, untrackedDays: 0 })
    expect(beta.previous).toEqual({ views: 6, enquiries: 1, untrackedDays: 0 })
    expect(beta.series).toHaveLength(7)
  })
  it('a listing nobody saved has zero saves; unreadable counts are unknown', () => {
    expect(result.find((r) => r.listingId === L2)!.saves).toBe(0)
    expect(buildPerformance({ cards, activity, saveCounts: null, viewsSince: '2026-10-01', today: '2026-10-14', range: 7 })[0]!.saves).toBeNull()
  })
})

describe('URL state', () => {
  it('falls back for anything unrecognised and round-trips', () => {
    expect(parseQuery({ range: '14', listing: 'nope' })).toEqual({ range: 7, listing: null })
    const href = performanceHref({ range: 90, listing: L1 })
    expect(parseQuery(Object.fromEntries(new URL(href, 'https://x.test').searchParams))).toEqual({ range: 90, listing: L1 })
    expect(performanceHref({ range: 7 })).toBe('/dashboard/performance')
  })
})
