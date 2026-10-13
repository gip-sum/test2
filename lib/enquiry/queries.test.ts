import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'buyer-token' }) }) }))
vi.mock('@/lib/auth/provider', () => ({ authConfig: () => ({ base: 'https://test.invalid/auth/v1', key: 'public-key' }) }))
import { listLeads, listingEnquiryCounts, recordListingLead } from './queries'

const listingId = 'd9140f33-a429-46f3-9514-3e8f32f18189', user = { id: 'seller', email: 'seller@example.com' }
const lead = { id: 'e1', listing_public_id: null, listing_id: listingId, listing_title: '2 BHK', buyer_name: 'Riya', buyer_phone: '+919876543210', message: null, duplicate_of: null, status: 'new', created_at: '2026-10-13T10:00:00Z' }
let reply: (url: string, init: RequestInit) => Response
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => reply(url, init))) })
afterEach(() => vi.unstubAllGlobals())
const calls = () => vi.mocked(fetch).mock.calls.map(([url, init]) => ({ url: String(url), init: init as RequestInit }))

describe('recordListingLead', () => {
  const input = { listingId, name: ' Riya Sen ', phone: '98765 43210', message: 'Parking?' }
  it('sends only the listing and the buyer’s own details; the database picks the seller', async () => {
    reply = () => Response.json([{ enquiry_id: 'e1', repeated: false, seller_notified: true }])
    expect(await recordListingLead(input, null)).toEqual({ ok: true, duplicate: false, sellerNotified: true })
    const [call] = calls()
    expect(call!.url).toBe('https://test.invalid/rest/v1/rpc/submit_listing_enquiry')
    expect(JSON.parse(call!.init.body as string)).toEqual({ p_listing: listingId, p_name: 'Riya Sen', p_phone: '+919876543210', p_message: 'Parking?' })
    expect(call!.init.headers).toMatchObject({ Authorization: 'Bearer public-key' })
  })
  it('a signed-in buyer enquires with their own session', async () => {
    reply = () => Response.json([{ enquiry_id: 'e1', repeated: true, seller_notified: true }])
    expect(await recordListingLead(input, user)).toMatchObject({ ok: true, duplicate: true })
    expect(calls()[0]!.init.headers).toMatchObject({ Authorization: 'Bearer buyer-token' })
  })
  it('validates before any request, including the listing identity', async () => {
    const result = await recordListingLead({ listingId: 'p_demo1', name: '', phone: '123' }, null)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['listing', 'name', 'phone'])
    expect(fetch).not.toHaveBeenCalled()
  })
  it.each([
    [410, /no longer available/], [429, /Too many recent enquiries/], [403, /your own listing/],
    [404, /not available yet/], [503, /could not be saved/],
  ])('explains database status %i honestly', async (status, message) => {
    reply = () => new Response(null, { status })
    const result = await recordListingLead(input, null)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.listing).toMatch(message)
  })
  it('an unexpected confirmation is not reported as sent', async () => {
    reply = () => Response.json([])
    expect((await recordListingLead(input, null)).ok).toBe(false)
  })
})

describe('listLeads', () => {
  it('reads listing identities and can narrow to one listing', async () => {
    reply = () => Response.json([lead])
    const result = await listLeads(user, 'seller', { listingId })
    expect(result).toEqual({ ok: true, rows: [lead] })
    expect(calls()[0]!.url).toContain(`seller_id=eq.seller&listing_id=eq.${listingId}`)
    expect(calls()[0]!.url).toContain('listing_id&')
  })
  it('before the Phase 19 migration, falls back to the Phase 9 columns for the unfiltered inbox', async () => {
    const legacy = { ...lead, listing_public_id: 'p_demo1' } as Record<string, unknown>
    delete legacy.listing_id
    reply = (url) => (url.includes(',listing_id&') ? new Response(null, { status: 400 }) : Response.json([legacy]))
    expect(await listLeads(user, 'seller')).toEqual({ ok: true, rows: [{ ...legacy, listing_id: null }] })
    expect(calls()).toHaveLength(2)
  })
  it('a listing filter is never silently widened to every lead', async () => {
    reply = () => new Response(null, { status: 400 })
    expect(await listLeads(user, 'seller', { listingId })).toEqual({ ok: false })
    expect(calls()).toHaveLength(1)
    expect(await listLeads(user, 'seller', { listingId: 'not-a-uuid' })).toEqual({ ok: false })
  })
})

describe('listingEnquiryCounts', () => {
  it('reads aggregated counts through the seller session', async () => {
    reply = () => Response.json([{ listing_id: listingId, total: 3, new_count: 1, latest_at: '2026-10-13T10:00:00Z' }])
    expect(await listingEnquiryCounts(user)).toHaveLength(1)
    expect(calls()[0]!.url).toContain('/rpc/seller_listing_enquiry_counts')
  })
  it('is null, never zero, when counts cannot be read', async () => {
    reply = () => new Response(null, { status: 404 })
    expect(await listingEnquiryCounts(user)).toBeNull()
    reply = () => Response.json([{ listing_id: listingId, total: 'three' }])
    expect(await listingEnquiryCounts(user)).toBeNull()
  })
})
