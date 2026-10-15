import { beforeEach, expect, it, vi } from 'vitest'
const id = 'a9140f33-a429-46f3-9514-000000000001'
const m = vi.hoisted(() => ({ fetch: vi.fn(), role: vi.fn(), user: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'user-token' }) }) }))
vi.mock('@/lib/auth/session', () => ({ ACCESS_COOKIE: 'gb-access', getVerifiedUser: m.user }))
vi.mock('@/lib/admin/queries', () => ({ staffRole: m.role }))
vi.mock('@/lib/auth/provider', () => ({ authConfig: () => ({ base: 'https://db.test/auth/v1', key: 'public-key' }) }))
import { accountAdmin, searchAccounts, getAccount, manageAccount } from './queries'
const account = { id, email: 'sample@example.test', full_name: null, created_at: '2026-10-15', last_sign_in_at: null, status: 'ACTIVE', seller_role: null, version: 0, staff_role: null, operator_managed: false }
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', m.fetch); m.user.mockResolvedValue({ id }); m.role.mockResolvedValue('ADMIN') })
it('requires a verified ADMIN', async () => {
  m.role.mockResolvedValue('MODERATOR'); await expect(accountAdmin()).rejects.toMatchObject({ status: 404 })
  m.user.mockResolvedValue(null); await expect(accountAdmin()).rejects.toMatchObject({ status: 401 })
})
it('search uses the callers token and projects only approved fields', async () => {
  m.fetch.mockResolvedValue(Response.json({ rows: [{ ...account, token: 'SECRET' }], total: 1, page: 1 }))
  const result = await searchAccounts({ q: '%', status: '', role: '', page: 1 })
  expect(result.rows[0]).toEqual(account); expect(JSON.stringify(result)).not.toContain('SECRET')
  const [url, options] = m.fetch.mock.calls[0]!
  expect(url).toBe('https://db.test/rest/v1/rpc/admin_users'); expect(options.cache).toBe('no-store'); expect(options.headers.Authorization).toBe('Bearer user-token')
})
it('projects private histories without other peoples details', async () => {
  const lead = { id, listing_id: id, listing_title: 'SAMPLE home', direction: 'received', status: 'new', created_at: '2026-10-15', buyer_phone: 'SECRET' }
  m.fetch.mockResolvedValue(Response.json({ account, contact_phone: null, preferred_intent: null, listings: { rows: [], total: 0, page: 1 }, leads: { rows: [lead], total: 1, page: 1 }, changes: { rows: [], total: 0, page: 1 } }))
  expect(JSON.stringify(await getAccount(id, { listings: 1, leads: 1, changes: 1 }))).not.toContain('SECRET')
})
it('rejects malformed provider data rather than fabricating an empty list', async () => {
  m.fetch.mockResolvedValue(Response.json({ rows: [account], total: 0, page: 1 }))
  await expect(searchAccounts({ q: '', status: '', role: '', page: 1 })).rejects.toThrow('invalid response')
})
it('maps not found, conflict, validation and outage without leaking database errors', async () => {
  const q = { q: '', status: '', role: '', page: 1 }
  for (const [code, status] of [['P0002', 404], ['42501', 404], ['40001', 409], ['22023', 400], ['XX000', 503]] as const) {
    m.fetch.mockResolvedValue(Response.json({ code, message: 'SECRET' }, { status: 400 }))
    await expect(searchAccounts(q)).rejects.toMatchObject({ status })
  }
})
it('requires the exact request/version confirmation after a write', async () => {
  m.fetch.mockResolvedValue(Response.json({ id, version: 9 }))
  await expect(manageAccount({ user: id, request: id, version: 0, status: 'ACTIVE', role: null, reason: 'SAMPLE reason', accepted: true })).rejects.toThrow('could not be confirmed')
})
