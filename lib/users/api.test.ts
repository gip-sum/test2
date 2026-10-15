import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const m = vi.hoisted(() => ({ admin: vi.fn(), manage: vi.fn() }))
vi.mock('./queries', () => ({ accountAdmin: m.admin, manageAccount: m.manage, AccountError: class extends Error { constructor(message: string, readonly status = 503) { super(message) } } }))
import { AccountError } from './queries'
import { POST } from '@/app/api/admin/users/route'
const id = 'a9140f33-a429-46f3-9514-000000000001'
const value = { user: id, request: id, version: 0, status: 'SUSPENDED', role: null, reason: 'SAMPLE account review', accepted: true }
const request = (body = JSON.stringify(value), origin = 'https://sample.test') => new NextRequest('https://sample.test/api/admin/users', { method: 'POST', headers: { origin }, body })
beforeEach(() => { vi.clearAllMocks(); m.admin.mockResolvedValue({ id }); m.manage.mockResolvedValue(undefined) })
it('checks origin and ADMIN before touching account data', async () => {
  expect((await POST(request(undefined, 'https://evil.test'))).status).toBe(403); expect(m.admin).not.toHaveBeenCalled()
  m.admin.mockRejectedValue(new AccountError('Account not found', 404))
  expect((await POST(request())).status).toBe(404); expect(m.manage).not.toHaveBeenCalled()
})
it('bounds actual bytes, refuses invalid JSON and requires confirmation', async () => {
  expect((await POST(request('a'.repeat(8193)))).status).toBe(413)
  expect((await POST(request('{'))).status).toBe(400)
  expect((await POST(request(JSON.stringify({ ...value, accepted: false })))).status).toBe(400)
  expect(m.manage).not.toHaveBeenCalled()
})
it('records a validated change privately', async () => {
  const response = await POST(request())
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ saved: true })
  expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(m.manage).toHaveBeenCalledWith(value)
})
it('preserves conflict recovery and never exposes unexpected database errors', async () => {
  m.manage.mockRejectedValue(new AccountError('Refresh the account', 409))
  expect((await POST(request())).status).toBe(409)
  m.manage.mockRejectedValue(new Error('PRIVATE DATABASE DETAILS'))
  expect(JSON.stringify(await (await POST(request())).json())).not.toContain('PRIVATE')
})
