import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'staff-token' }) }) }))
vi.mock('@/lib/auth/provider', () => ({ authConfig: () => ({ base: 'https://test.invalid/auth/v1', key: 'public-key' }) }))
const m = vi.hoisted(() => ({ user: null as null | { id: string; email: string } }))
vi.mock('@/lib/auth/session', () => ({ ACCESS_COOKIE: 'gb-access', getVerifiedUser: async () => m.user }))
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw Object.assign(new Error('redirect'), { to }) }, notFound: () => { throw new Error('not found') } }))
import { adminListings, adminOverview, requireStaff, staffRole } from './queries'

let reply: (url: string, init: RequestInit) => Response
beforeEach(() => { m.user = { id: 'staff', email: 'staff@example.com' }; vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => reply(url, init))) })
afterEach(() => vi.unstubAllGlobals())
const overview = { listings: { ACTIVE: 2, UNDER_REVIEW: 1 }, drafts_never_submitted: 0, queue: { waiting: 1, oldest_since: '2026-10-13T00:00:00Z' }, leads: { last_7_days: 1, last_30_days: 2, real_listings_30_days: 1, no_seller_30_days: 0, untouched_over_2_days: 0 }, users: { total: 3, new_7_days: 1, with_listings: 1, staff: 1 } }

describe('the staff gate', () => {
  it('moderators can review but cannot enter the admin console', async () => {
    reply = () => Response.json('MODERATOR')
    expect(await staffRole()).toBe('MODERATOR')
    await expect(requireStaff('/admin')).rejects.toThrow('not found')
    expect(await requireStaff('/admin/moderation', ['ADMIN', 'MODERATOR'])).toMatchObject({ role: 'MODERATOR' })
  })
  it('a signed-out visitor is sent to log in and back', async () => {
    m.user = null
    await expect(requireStaff('/admin/listings?status=review')).rejects.toMatchObject({ to: '/login?next=%2Fadmin%2Flistings%3Fstatus%3Dreview' })
  })
  it('a signed-in account without an active role gets the ordinary 404', async () => {
    reply = () => Response.json(null)
    await expect(requireStaff('/admin')).rejects.toThrow('not found')
  })
  it('a role that cannot be read is not a role (e.g. before the migration)', async () => {
    reply = () => new Response(null, { status: 404 })
    expect(await staffRole()).toBeNull()
    reply = () => Response.json('SUPERUSER')
    expect(await staffRole()).toBeNull()
  })
  it('active staff pass, with the user’s own session', async () => {
    reply = () => Response.json('ADMIN')
    expect(await requireStaff('/admin')).toMatchObject({ role: 'ADMIN', user: { id: 'staff' } })
    expect((vi.mocked(fetch).mock.calls[0]![1]!.headers as Record<string, string>).Authorization).toBe('Bearer staff-token')
  })
})

describe('admin reads', () => {
  it('accepts a well-formed overview and rejects anything else', async () => {
    reply = () => Response.json(overview)
    expect(await adminOverview()).toEqual(overview)
    reply = () => Response.json({ ...overview, listings: { PUBLISHED: 1 } })
    expect(await adminOverview()).toBeNull()
    reply = () => new Response(null, { status: 403 })
    expect(await adminOverview()).toBeNull()
  })
  it('asks for one page by filter and reports the total', async () => {
    reply = () => Response.json([{ id: 'l1', status: 'UNDER_REVIEW', title: 'Listing', submitted_at: '2026-10-13', price: '6000000', total: '30' }])
    expect(await adminListings('review', 2)).toMatchObject({ total: 30, rows: [{ price: 6000000 }] })
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string)).toEqual({ p_status: 'UNDER_REVIEW', p_limit: 25, p_offset: 25 })
  })
  it('a page past the end still knows the total', async () => {
    reply = (_url, init) => Response.json(JSON.parse(init.body as string).p_offset ? [] : [{ id: 'l1', status: 'ACTIVE', title: 'Listing', submitted_at: '2026-10-13', price: 1, total: 3 }])
    expect(await adminListings('all', 9)).toEqual({ rows: [], total: 3 })
  })
})
