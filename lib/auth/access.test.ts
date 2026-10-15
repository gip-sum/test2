import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('./provider', () => ({ authConfig: () => ({ base: 'https://db.test/auth/v1', key: 'public-key' }) }))
import { marketplaceAccess } from './access'
const fetchMock = vi.fn()
beforeEach(() => { vi.stubGlobal('fetch', fetchMock) })
it('checks live status with the user token, without caching', async () => {
  fetchMock.mockResolvedValueOnce(Response.json(true)).mockResolvedValueOnce(Response.json(false)).mockResolvedValueOnce(Response.json(true))
  expect(await marketplaceAccess('same-token')).toBe('active')
  expect(await marketplaceAccess('same-token')).toBe('suspended')
  expect(await marketplaceAccess('same-token')).toBe('active')
  expect(fetchMock.mock.calls[0]![1]).toMatchObject({ cache: 'no-store', headers: { Authorization: 'Bearer same-token' } })
})
it('fails closed on outage, missing migration and malformed data', async () => {
  for (const response of [Response.json({}, { status: 404 }), Response.json(null), Response.json('true')]) {
    fetchMock.mockResolvedValue(response); expect(await marketplaceAccess('token')).toBe('unavailable')
  }
  fetchMock.mockRejectedValue(new Error('offline')); expect(await marketplaceAccess('token')).toBe('unavailable')
})
