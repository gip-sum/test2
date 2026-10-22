import { beforeEach, afterEach, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('@/lib/auth/provider', () => ({ authConfig: () => ({ base: 'https://test.invalid/auth/v1', key: 'public-key' }) }))
import { getPublishedCards } from './queries'
import { cardOfListing } from './overview'
import type { PublicSubmission } from './types'

// Saved real listings as results cards (UI-19).
const L = (n: number) => `d9140f33-a429-46f3-9514-00000000000${n}`, S = (n: number) => `e9140f33-a429-46f3-9514-00000000000${n}`
const submission = (n: number): PublicSubmission => ({
  id: S(n), listing_id: L(n), title: `Listing ${n}`, seller_name: 'Seller', seller_type: 'OWNER', intent: 'buy', property_type: 'APARTMENT', bedrooms: 2, bathrooms: 2,
  area_unit: 'sqft', carpet_area: 900, built_up_area: null, super_area: null, furnishing: 'UNFURNISHED', floor: 3, total_floors: 8, construction_status: 'READY', age_years: 4,
  possession_by: null, available_from: null, city_name: 'Kolkata', locality_name: 'New Town', city_id: 'c', locality_id: 'l', sub_locality_id: null, society_name: null,
  address: 'Private address', latitude: null, longitude: null, price: 6000000, deposit: null, maintenance_status: 'none', maintenance_monthly: null, negotiable: false, created_at: '2026-10-01T00:00:00Z', description: null,
})
const listings = [
  { id: L(1), status: 'ACTIVE', current_submission_id: S(1), expires_at: '2099-01-01', activated_at: '2026-10-10T00:00:00Z' },
  { id: L(2), status: 'ACTIVE', current_submission_id: S(2), expires_at: '2020-01-01', activated_at: '2019-12-01T00:00:00Z' }, // expired
  { id: L(3), status: 'UNDER_REVIEW', current_submission_id: S(3), expires_at: null, activated_at: null },
]
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/rest/v1/property_listings?')) return Response.json(listings)
    if (url.includes('/rest/v1/property_listing_submissions?')) return Response.json([submission(1)])
    if (url.includes('/rest/v1/property_listing_photos?')) return Response.json([{ id: 'p2', submission_id: S(1), position: 2 }, { id: 'p1', submission_id: S(1), position: 1 }])
    throw Error('Unexpected fetch ' + url)
  }))
})
afterEach(() => vi.unstubAllGlobals())

it('reads any number of saved listings in three public reads, and only those public now', async () => {
  const cards = await getPublishedCards([L(1), L(2), L(3)])
  const calls = vi.mocked(fetch).mock.calls.map(([url]) => String(url))
  expect(calls).toHaveLength(3)
  expect(calls[1]).toContain(`id=in.(${S(1)})`)
  expect(vi.mocked(fetch).mock.calls.every(([, init]) => JSON.stringify(init?.headers).includes('public-key'))).toBe(true)
  expect([...cards.keys()]).toEqual([L(1)])
  expect(cards.get(L(1))!.photos.map((p) => p.id)).toEqual(['p1', 'p2'])
  expect(cards.get(L(1))!.activatedAt).toBe('2026-10-10T00:00:00Z')
})
it('reads nothing for an empty shortlist', async () => {
  expect((await getPublishedCards([])).size).toBe(0)
  expect(fetch).not.toHaveBeenCalled()
})
it('maps a listing to the results card with only what the seller gave, photos sized by their own route', () => {
  const card = cardOfListing(L(1), submission(1), [{ id: 'p1' }], '2026-10-10T00:00:00Z')
  expect(card).toMatchObject({ title: 'Listing 1', localityName: 'New Town', cityName: 'Kolkata', price: 6000000, intent: 'buy', bedrooms: 2, carpetArea: 900, areaBasis: 'carpet', postedAt: '2026-10-10T00:00:00Z', href: `/listing/${L(1)}`, saveId: L(1) })
  expect(card.photos[0]).toMatchObject({ url: `/api/listings/${L(1)}/photos/p1`, authenticated: true, sizedByRoute: true })
  expect(JSON.stringify(card)).not.toContain('Private address')
  // A plot or shop has no bedrooms: the card shows its type instead.
  expect(cardOfListing(L(1), { ...submission(1), bedrooms: null }, [], null).bedrooms).toBe(0)
})
