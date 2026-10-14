import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const m = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/lib/auth/provider', () => ({ authConfig: () => ({ base: 'https://test.invalid', key: 'public-key' }), authRequest: m.request, validSession: () => false }))
import { proxy } from '@/proxy'
beforeEach(() => { vi.clearAllMocks(); m.request.mockResolvedValue({ ok: true, data: { id: 'staff' } }) })
it('moderation mutations and photos use the auth guard rather than the city parser', async () => {
  for (const path of ['/api/admin/moderation', '/api/admin/moderation/a9140f33-a429-46f3-9514-3e8f32f18189/photos/a9140f33-a429-46f3-9514-3e8f32f18189']) {
    const response = await proxy(new NextRequest('https://site.test' + path, { headers: { Cookie: 'gb-access=staff-token' } }))
    expect(response.headers.get('x-middleware-next')).toBe('1'); expect(response.headers.has('x-middleware-rewrite')).toBe(false)
  }
  expect(m.request).toHaveBeenCalledWith('/user', 'GET', undefined, 'staff-token')
})
