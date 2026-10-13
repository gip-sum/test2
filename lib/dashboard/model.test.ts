import { describe, it, expect } from 'vitest'
import { getPostingLocations } from '@/lib/location/queries'
import type { Draft } from '@/lib/drafts/types'
import type { Listing, ListingEvent, SubmissionSummary } from '@/lib/listings/types'
import { arrange, buildCards, dashboardHref, displayStatus, parseQuery, PAGE_SIZE, type DashboardInput } from './model'

const NOW = Date.parse('2026-10-13T12:00:00Z'), DAY = 86_400_000
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString()
const uuid = (n: number) => `a9140f33-a429-46f3-9514-${String(n).padStart(12, '0')}`
const complete: Partial<Draft> = { role: 'OWNER', intent: 'buy', type: 'APARTMENT', bhk: '2', baths: '2', unit: 'sqft', carpet: '1000', furnishing: 'UNFURNISHED', floor: '3', floors: '8', status: 'READY', age: '4', city: 'kolkata', locality: 'new-town', address: 'Test building address', saleprice: '6000000', maintenance: 'none', negotiable: 'yes' }
const draft = (n: number, extra: Partial<Draft> = {}): Draft => ({ id: uuid(n), owner_id: 'owner', collection_id: uuid(900 + n), revision: 1, created_at: iso(-30), updated_at: iso(-n), page_path: '/post', ...extra })
const listing = (n: number, extra: Partial<Listing> = {}): Listing => ({ id: uuid(100 + n), owner_id: 'owner', draft_id: uuid(n), current_submission_id: uuid(200 + n), status: 'UNDER_REVIEW', version: 1, created_at: iso(-20), updated_at: iso(-2), activated_at: null, expires_at: null, rejection_reason: null, ...extra })
const submission = (n: number, extra: Partial<SubmissionSummary> = {}): SubmissionSummary => ({ id: uuid(200 + n), listing_id: uuid(100 + n), title: `Submitted ${n}`, intent: 'rent', price: 25000, city_name: 'Kolkata', locality_name: 'Salt Lake', ...extra })
const input = (over: Partial<DashboardInput>): DashboardInput => ({ drafts: [], listings: [], draftEvents: [], submissions: [], enquiryCounts: [], places: getPostingLocations(), today: '2026-10-13', now: NOW, ...over })
const withdrawEvent = (n: number, from: ListingEvent['from_status'], at = iso(-1)) => ({ listing_id: uuid(100 + n), from_status: from, to_status: 'DRAFT' as const, created_at: at })

describe('displayStatus', () => {
  it('a draft with no listing row is a draft', () => expect(displayStatus(null, undefined, NOW)).toBe('DRAFT'))
  it('derives Withdrawn from a DRAFT event that came from another status', () => {
    expect(displayStatus({ status: 'DRAFT', expires_at: null }, { from_status: 'ACTIVE' }, NOW)).toBe('WITHDRAWN')
    expect(displayStatus({ status: 'DRAFT', expires_at: null }, { from_status: null }, NOW)).toBe('DRAFT')
  })
  it('an active listing past its expiry is Expired before the hourly job runs', () => {
    expect(displayStatus({ status: 'ACTIVE', expires_at: iso(-0.01) }, undefined, NOW)).toBe('EXPIRED')
    expect(displayStatus({ status: 'ACTIVE', expires_at: iso(1) }, undefined, NOW)).toBe('ACTIVE')
  })
  it('a deleted listing is Removed', () => expect(displayStatus({ status: 'DELETED', expires_at: null }, undefined, NOW)).toBe('REMOVED'))
})

describe('buildCards', () => {
  it('gives a draft and its listing one card, described by the submitted copy', () => {
    const cards = buildCards(input({ drafts: [draft(1, complete)], listings: [listing(1)], submissions: [submission(1)] }))
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ status: 'UNDER_REVIEW', title: 'Submitted 1', intent: 'rent', price: 25000, place: 'Salt Lake, Kolkata', progress: null })
  })

  it('describes a never-submitted draft from its saved answers, with section progress', () => {
    const [full] = buildCards(input({ drafts: [draft(1, complete)] }))
    expect(full).toMatchObject({ status: 'DRAFT', intent: 'buy', price: 6000000, progress: { complete: 4, total: 4 }, listing: null, enquiries: null })
    expect(full!.title).toBe('2 BHK flat / apartment for sale in New Town')
    const [empty] = buildCards(input({ drafts: [draft(2)] }))
    expect(empty).toMatchObject({ title: 'New property draft', price: null, intent: null, place: null, progress: { complete: 0, total: 4 } })
  })

  it('never falls back to the working draft price when the submitted copy could not be read', () => {
    const [card] = buildCards(input({ drafts: [draft(1, { ...complete, saleprice: '9900000' })], listings: [listing(1)], submissions: null }))
    expect(card).toMatchObject({ detailsUnavailable: true, price: null, intent: null, place: null })
  })

  it('keeps a listing whose draft is missing from the response', () => {
    const cards = buildCards(input({ listings: [listing(5)], submissions: [submission(5)] }))
    expect(cards.map((c) => c.title)).toEqual(['Submitted 5'])
  })

  it('dates each status by the moment that matters', () => {
    const cards = buildCards(input({
      drafts: [1, 2, 3, 4].map((n) => draft(n)),
      listings: [listing(1, { status: 'ACTIVE', activated_at: iso(-10), expires_at: iso(5) }), listing(2, { status: 'ACTIVE', activated_at: iso(-95), expires_at: iso(-3) }), listing(3, { status: 'DRAFT', current_submission_id: uuid(203) }), listing(4, { status: 'REJECTED', rejection_reason: 'Please add a clear photo of the entrance' })],
      draftEvents: [withdrawEvent(3, 'UNDER_REVIEW', iso(-4)), withdrawEvent(3, null, iso(-9))],
      submissions: [1, 2, 3, 4].map((n) => submission(n)),
    }))
    const by = (n: number) => cards.find((c) => c.draftId === uuid(n))!
    expect(by(1)).toMatchObject({ status: 'ACTIVE', since: iso(-10), expiresAt: iso(5), daysLeft: 5, expiringSoon: true })
    expect(by(2)).toMatchObject({ status: 'EXPIRED', since: iso(-3), daysLeft: null, expiringSoon: false })
    expect(by(3)).toMatchObject({ status: 'WITHDRAWN', since: iso(-4) })
    expect(by(4)).toMatchObject({ status: 'REJECTED', rejectionReason: 'Please add a clear photo of the entrance' })
  })

  it('warns at 7 days and not before', () => {
    const cards = buildCards(input({ listings: [listing(1, { status: 'ACTIVE', activated_at: iso(-1), expires_at: iso(7) }), listing(2, { status: 'ACTIVE', activated_at: iso(-1), expires_at: iso(7.5) })] }))
    expect(cards.map((c) => [c.daysLeft, c.expiringSoon])).toEqual([[7, true], [8, false]])
  })

  it('reports enquiry counts per listing, zero when none, and unavailable when unread', () => {
    const listings = [listing(1, { status: 'ACTIVE', activated_at: iso(-1), expires_at: iso(30) }), listing(2)]
    const counted = buildCards(input({ listings, enquiryCounts: [{ listing_id: uuid(101), total: 3, new_count: 1, latest_at: iso(0) }] }))
    expect(counted.map((c) => c.enquiries)).toEqual([{ total: 3, newCount: 1 }, { total: 0, newCount: 0 }])
    expect(buildCards(input({ listings, enquiryCounts: null })).map((c) => c.enquiries)).toEqual(['unavailable', 'unavailable'])
  })
})

describe('arrange', () => {
  const cards = buildCards(input({
    drafts: [1, 2, 3, 4, 5, 6].map((n) => draft(n)),
    listings: [listing(2), listing(3, { status: 'ACTIVE', activated_at: iso(-1), expires_at: iso(20) }), listing(4, { status: 'ACTIVE', activated_at: iso(-1), expires_at: iso(3) }), listing(5, { status: 'DELETED' }), listing(6, { status: 'DRAFT' })],
    draftEvents: [withdrawEvent(6, 'ACTIVE')],
  }))

  it('counts each property once and leaves Removed out of every count', () => {
    const view = arrange(cards, parseQuery({}))
    expect(view.counts).toEqual({ all: 5, draft: 1, review: 1, active: 2, expired: 0, rejected: 0, withdrawn: 1 })
    expect(view.removed.map((c) => c.draftId)).toEqual([uuid(5)])
    expect(view.visible.some((c) => c.status === 'REMOVED')).toBe(false)
    expect(view.expiringSoon).toBe(1)
  })

  it('filters by status and sorts active listings by soonest expiry', () => {
    expect(arrange(cards, parseQuery({ status: 'withdrawn' })).visible.map((c) => c.draftId)).toEqual([uuid(6)])
    expect(arrange(cards, parseQuery({ status: 'active', sort: 'expiring' })).visible.map((c) => c.draftId)).toEqual([uuid(4), uuid(3)])
    expect(arrange(cards, parseQuery({ sort: 'expiring' })).visible.slice(0, 2).map((c) => c.draftId)).toEqual([uuid(4), uuid(3)])
  })

  it('paginates at 20 and clamps a page beyond the end', () => {
    const many = buildCards(input({ drafts: Array.from({ length: 45 }, (_, i) => draft(i + 1)) }))
    const last = arrange(many, parseQuery({ page: '9' }))
    expect([last.page, last.pageCount, last.visible.length]).toEqual([3, 3, 45 - 2 * PAGE_SIZE])
    expect(arrange(many, parseQuery({})).visible[0]!.draftId).toBe(uuid(1))
  })
})

describe('URL state', () => {
  it('falls back to defaults for anything unrecognised', () => {
    expect(parseQuery({ status: 'removed', sort: 'price', page: '-2' })).toEqual({ status: 'all', sort: 'recent', page: 1 })
    expect(parseQuery({ status: ['active', 'draft'], page: '2' })).toEqual({ status: 'active', sort: 'recent', page: 2 })
  })
  it('round-trips through the address and omits defaults', () => {
    expect(dashboardHref({ status: 'all', sort: 'recent', page: 1 })).toBe('/dashboard')
    const href = dashboardHref({ status: 'active', sort: 'expiring', page: 2 })
    expect(parseQuery(Object.fromEntries(new URL(href, 'https://x.test').searchParams))).toEqual({ status: 'active', sort: 'expiring', page: 2 })
  })
})
