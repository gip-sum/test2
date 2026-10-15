import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const m = vi.hoisted(() => ({ access: vi.fn(), request: vi.fn(), valid: vi.fn() }))
vi.mock('@/lib/auth/provider', () => ({ authConfig: () => ({ base: 'https://db.test', key: 'public-key' }), authRequest: m.request, validSession: m.valid }))
vi.mock('@/lib/auth/access', () => ({ marketplaceAccess: m.access }))
import { proxy } from '@/proxy'
const request = (path: string) => new NextRequest('https://site.test' + path, { headers: { Cookie: 'gb-access=existing-token' } })
beforeEach(() => { vi.clearAllMocks(); m.valid.mockReturnValue(false); m.request.mockResolvedValue({ ok: true, data: { id: 'user' } }); m.access.mockResolvedValue('active') })
it('protects account management API and keeps private cache headers', async () => {
  const response = await proxy(request('/api/admin/users'))
  expect(response.headers.get('x-middleware-next')).toBe('1'); expect(response.headers.get('cache-control')).toBe('private, no-store')
})
it('blocks suspended tokens at the API and sends pages to recovery', async () => {
  m.access.mockResolvedValue('suspended')
  expect((await proxy(request('/api/admin/users'))).status).toBe(403)
  expect((await proxy(request('/dashboard'))).headers.get('location')).toBe('https://site.test/account/access')
})
it('fails closed on outages and permits access recovery', async () => {
  m.access.mockResolvedValue('unavailable')
  expect((await proxy(request('/api/admin/users'))).status).toBe(503)
  expect((await proxy(request('/account/access'))).headers.get('x-middleware-next')).toBe('1')
})
it('keeps refreshed cookies when the fresh token is suspended', async () => {
  m.request.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, data: { access_token: 'fresh-access', refresh_token: 'fresh-refresh', expires_in: 3600 } })
  m.valid.mockReturnValue(true); m.access.mockResolvedValue('suspended')
  const response = await proxy(new NextRequest('https://site.test/dashboard', { headers: { Cookie: 'gb-access=expired; gb-refresh=refresh' } }))
  expect(m.access).toHaveBeenCalledWith('fresh-access')
  expect(response.headers.get('location')).toBe('https://site.test/account/access')
  expect(response.cookies.get('gb-access')?.value).toBe('fresh-access')
  expect(response.cookies.get('gb-refresh')?.value).toBe('fresh-refresh')
})
