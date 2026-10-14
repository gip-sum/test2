import { afterEach, describe, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'buyer-token' }) }) }))
vi.mock('@/lib/auth/provider', () => ({ authConfig: () => ({ base: 'https://test.invalid/auth/v1', key: 'public-key' }) }))
vi.mock('@/lib/auth/session', () => ({ ACCESS_COOKIE: 'gb-access' }))
import { listSavedListings, setSavedListing } from './queries'

const user = { id: 'buyer', email: 'buyer@example.com' }, listing = 'd9140f33-a429-46f3-9514-3e8f32f18189'
const reply = (r: () => Response) => vi.stubGlobal('fetch', vi.fn(async () => r()))
afterEach(() => vi.unstubAllGlobals())

describe('saved real listings', () => {
  it('reads the buyer’s own saves', async () => {
    reply(() => Response.json([{ listing_id: listing, created_at: '2026-10-14T00:00:00Z' }]))
    expect(await listSavedListings(user)).toEqual({ ok: true, rows: [{ listing_id: listing, created_at: '2026-10-14T00:00:00Z' }] })
    expect(String(vi.mocked(fetch).mock.calls[0]![0])).toContain('saved_listings?select=listing_id,created_at&user_id=eq.buyer')
  })
  it('tells a missing table (before the migration) from a failure', async () => {
    reply(() => new Response(null, { status: 404 }))
    expect(await listSavedListings(user)).toEqual({ ok: false, missing: true })
    reply(() => new Response(null, { status: 503 }))
    expect(await listSavedListings(user)).toEqual({ ok: false, missing: false })
  })
  it('saves through the checking database function and removes through the buyer’s own row', async () => {
    reply(() => Response.json(true))
    expect(await setSavedListing(user, listing, true)).toBe('ok')
    expect(String(vi.mocked(fetch).mock.calls[0]![0])).toContain('/rpc/save_listing')
    expect(await setSavedListing(user, listing, false)).toBe('ok')
    expect(vi.mocked(fetch).mock.calls[1]![1]!.method).toBe('DELETE')
  })
  it.each([[410, 'unavailable'], [403, 'own'], [429, 'limit'], [503, 'error']] as const)('maps database status %i to %s', async (status, expected) => {
    reply(() => new Response(null, { status }))
    expect(await setSavedListing(user, listing, true)).toBe(expected)
  })
  it('never sends a malformed id', async () => {
    reply(() => Response.json(true))
    expect(await setSavedListing(user, 'p_demo1', true)).toBe('unavailable')
    expect(fetch).not.toHaveBeenCalled()
  })
})
