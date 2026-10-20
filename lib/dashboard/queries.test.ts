import { beforeEach, afterEach, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'owner-token' }) }) }))
vi.mock('@/lib/auth/provider', () => ({ authConfig: () => ({ base: 'https://test.invalid/auth/v1', key: 'public-key' }) }))
vi.mock('@/lib/auth/session', () => ({ ACCESS_COOKIE: 'gb-access', getVerifiedUser: async () => null }))
import { loadDashboard } from './queries'

const user = { id: 'a9140f33-a429-46f3-9514-3e8f32f18100', email: 'owner@example.com' }
const draftId = 'c9140f33-a429-46f3-9514-3e8f32f18189', listingId = 'd9140f33-a429-46f3-9514-3e8f32f18189', submissionId = 'e9140f33-a429-46f3-9514-3e8f32f18189'
const draft = { id: draftId, owner_id: user.id, collection_id: draftId, revision: 1, created_at: '2026-10-01', updated_at: '2026-10-02', page_path: '/post' }
const listing = { id: listingId, owner_id: user.id, draft_id: draftId, current_submission_id: submissionId, status: 'DRAFT', version: 3, created_at: '2026-10-01', updated_at: '2026-10-05', activated_at: null, expires_at: null, rejection_reason: null }
let fail: string | null = null
beforeEach(() => {
  fail = null
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-secret')
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (fail && url.includes(fail)) return new Response(null, { status: 503 })
    if (url.includes('/property_drafts?')) return Response.json([draft])
    if (url.includes('/property_listings?')) return Response.json([listing])
    if (url.includes('/property_listing_events?')) return Response.json([{ listing_id: listingId, from_status: 'ACTIVE', to_status: 'DRAFT', created_at: '2026-10-05' }])
    if (url.includes('/property_listing_submissions?')) return Response.json([{ id: submissionId, listing_id: listingId, title: 'Submitted copy', intent: 'buy', price: 6000000, city_name: 'Kolkata', locality_name: 'New Town' }])
    if (url.includes('/rpc/seller_listing_enquiry_counts')) return Response.json([{ listing_id: listingId, total: 2, new_count: 2, latest_at: '2026-10-06' }])
    if (url.includes('/property_listing_photos?')) return Response.json([{ id: 'f9140f33-a429-46f3-9514-000000000002', submission_id: submissionId, position: 1 }, { id: 'f9140f33-a429-46f3-9514-000000000001', submission_id: submissionId, position: 0 }])
    if (url.includes('/media_assets?')) return Response.json([])
    throw Error('Unexpected fetch ' + url)
  }))
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('reads everything with the owner session and never the service key', async () => {
  const result = await loadDashboard(user)
  expect(result.ok && result.cards).toMatchObject([{ status: 'WITHDRAWN', title: 'Submitted copy', enquiries: { total: 2, newCount: 2 } }])
  for (const [, init] of vi.mocked(fetch).mock.calls) {
    expect(JSON.stringify(init?.headers)).not.toContain('server-secret')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer owner-token')
  }
  expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('to_status=eq.DRAFT'))).toBe(true)
})

it('history is essential: without it a withdrawal cannot be told from a draft, so the page reports an error', async () => {
  fail = '/property_listing_events?'
  expect(await loadDashboard(user)).toEqual({ ok: false })
})

it.each(['/property_drafts?', '/property_listings?'])('an essential read failing (%s) is an error, never an empty dashboard', async (path) => {
  fail = path
  expect(await loadDashboard(user)).toEqual({ ok: false })
})

it('supplementary reads failing still render, saying what is unavailable', async () => {
  fail = '/property_listing_submissions?'
  let result = await loadDashboard(user)
  expect(result.ok && result.cards[0]).toMatchObject({ detailsUnavailable: true, price: null })
  fail = '/rpc/seller_listing_enquiry_counts'
  result = await loadDashboard(user)
  expect(result.ok && result.cards[0]?.enquiries).toBe('unavailable')
})

it('covers and photo counts: one batched read each, never one per card (UI-18)', async () => {
  const result = await loadDashboard(user)
  expect(result.ok && result.cards[0]).toMatchObject({ cover: `/api/posting/submissions/${listingId}/photos/f9140f33-a429-46f3-9514-000000000001`, photoCount: 2 })
  const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url))
  expect(urls.filter((u) => u.includes('/property_listing_photos?'))).toHaveLength(1)
  expect(urls.find((u) => u.includes('/property_listing_photos?'))).toContain(`submission_id=in.(${submissionId})`)
  // The only draft is submitted, so no draft-photo read is needed for it.
  expect(urls.find((u) => u.includes('/media_assets?'))).toBeUndefined()
})

it('photos failing still render the cards, with no cover and an unknown count', async () => {
  fail = '/property_listing_photos?'
  const result = await loadDashboard(user)
  expect(result.ok && result.cards[0]).toMatchObject({ status: 'WITHDRAWN', cover: null, photoCount: null })
})
