import { beforeEach, afterEach, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'owner-token' }) }) }))
vi.mock('@/lib/auth/provider', () => ({ authConfig: () => ({ base: 'https://test.invalid/auth/v1', key: 'public-key' }) }))
vi.mock('@/lib/auth/session', () => ({ ACCESS_COOKIE: 'gb-access' }))
const m = vi.hoisted(() => ({ dashboard: vi.fn() }))
vi.mock('@/lib/dashboard/queries', () => ({ loadDashboard: m.dashboard }))
vi.mock('@/lib/posting/details', () => ({ kolkataToday: (d?: Date) => (d ? d.toISOString().slice(0, 10) : '2026-10-14') }))
import { loadPerformance } from './queries'
import { recordListingView } from './record'

const user = { id: 'owner', email: 'owner@example.com' }, listing = 'd9140f33-a429-46f3-9514-3e8f32f18189'
let replies: Record<string, () => Response>
beforeEach(() => {
  m.dashboard.mockResolvedValue({ ok: true, cards: [] })
  replies = {
    seller_listing_activity: () => Response.json([{ listing_id: listing, day: '2026-10-14', views: 3, enquiries: 1 }]),
    seller_listing_save_counts: () => Response.json([{ listing_id: listing, saves: 2 }]),
    listing_analytics_meta: () => Response.json([{ views_since: '2026-10-12T05:00:00Z' }]),
  }
  vi.stubGlobal('fetch', vi.fn(async (url: string) => { const key = Object.keys(replies).find((k) => url.includes(k)); if (!key) throw Error('Unexpected ' + url); return replies[key]!() }))
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('reads two periods at once with the owner session only', async () => {
  const result = await loadPerformance(user, 7)
  expect(result).toMatchObject({ ok: true, viewsSince: '2026-10-12', saveCounts: [{ listing_id: listing, saves: 2 }], today: '2026-10-14' })
  const activity = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes('seller_listing_activity'))!
  expect(JSON.parse(activity[1]!.body as string)).toEqual({ p_from: '2026-10-01', p_to: '2026-10-14' })
  for (const [, init] of vi.mocked(fetch).mock.calls) expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer owner-token')
})

it('says "not available yet" before the migration, and "could not load" on other failures', async () => {
  replies.seller_listing_activity = () => new Response(null, { status: 404 })
  expect(await loadPerformance(user, 7)).toEqual({ ok: false, reason: 'not-ready' })
  replies.seller_listing_activity = () => new Response(null, { status: 503 })
  expect(await loadPerformance(user, 7)).toEqual({ ok: false, reason: 'activity' })
  replies.seller_listing_activity = () => Response.json([{ listing_id: listing, day: 'yesterday', views: -1, enquiries: 0 }])
  expect(await loadPerformance(user, 7)).toEqual({ ok: false, reason: 'activity' })
  m.dashboard.mockResolvedValue({ ok: false })
  expect(await loadPerformance(user, 7)).toEqual({ ok: false, reason: 'dashboard' })
})

it('save counts and the start date degrade on their own, never to a false zero', async () => {
  replies.seller_listing_save_counts = () => new Response(null, { status: 503 })
  replies.listing_analytics_meta = () => new Response(null, { status: 503 })
  expect(await loadPerformance(user, 30)).toMatchObject({ ok: true, saveCounts: null, viewsSince: null })
})

it('records a view with the service key and never throws', async () => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test')
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
  await recordListingView(listing, 'a'.repeat(64), null)
  const [url, init] = vi.mocked(fetch).mock.calls[0]!
  expect(String(url)).toBe('https://test.invalid/rest/v1/rpc/record_listing_view')
  expect(init!.headers).toMatchObject({ apikey: 'sb_secret_test' })
  expect(init!.headers).not.toHaveProperty('Authorization')
  expect(JSON.parse(init!.body as string)).toEqual({ p_listing: listing, p_visitor_key: 'a'.repeat(64), p_viewer: null })
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down') }))
  await expect(recordListingView(listing, 'a'.repeat(64), 'owner')).resolves.toBeUndefined()
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  vi.mocked(fetch).mockClear()
  await recordListingView(listing, 'a'.repeat(64), null)
  expect(fetch).not.toHaveBeenCalled()
})
