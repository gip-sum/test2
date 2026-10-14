import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const m = vi.hoisted(() => ({ reviewer: vi.fn(), decide: vi.fn(), photo: vi.fn() }))
vi.mock('@/lib/moderation/queries', () => ({ reviewerUser: m.reviewer, decideListing: m.decide, reviewPhoto: m.photo,
  ModerationError: class extends Error { constructor(message: string, readonly status = 503) { super(message) } } }))
import { POST } from '@/app/api/admin/moderation/route'
import { GET } from '@/app/api/admin/moderation/[id]/photos/[photoId]/route'
import { ModerationError } from './queries'
const id = 'a9140f33-a429-46f3-9514-3e8f32f18189'
const input = { listing: id, submission: id, version: 1, action: 'APPROVE', days: 90, reason: null, request: id, accepted: true }
const request = (body: string, origin = 'https://example.test') => new NextRequest('https://example.test/api/admin/moderation', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body })
beforeEach(() => { vi.clearAllMocks(); m.reviewer.mockResolvedValue({ id: 'staff' }); m.decide.mockResolvedValue({}) })
describe('moderation API', () => {
  it('checks origin, verified staff and bounded valid confirmed input before deciding', async () => {
    expect((await POST(request(JSON.stringify(input), 'https://foreign.test'))).status).toBe(403)
    expect(m.reviewer).not.toHaveBeenCalled()
    m.reviewer.mockRejectedValue(new ModerationError('Sign in', 401))
    expect((await POST(request(JSON.stringify(input)))).status).toBe(401)
    expect(m.decide).not.toHaveBeenCalled()
    m.reviewer.mockResolvedValue({ id: 'staff' })
    for (const body of ['{', JSON.stringify({ ...input, accepted: false }), 'x'.repeat(12001)]) {
      expect((await POST(request(body))).status).toBe(body.length > 12000 ? 413 : 400)
    }
    expect(m.decide).not.toHaveBeenCalled()
    const response = await POST(request(JSON.stringify(input)))
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ saved: true })
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(m.decide).toHaveBeenCalledWith(input)
  })
  it('keeps conflict messages useful and unexpected errors private', async () => {
    m.decide.mockRejectedValue(new ModerationError('Refresh review', 409))
    expect((await POST(request(JSON.stringify(input)))).status).toBe(409)
    m.decide.mockRejectedValue(new Error('SECRET'))
    expect(JSON.stringify(await (await POST(request(JSON.stringify(input)))).json())).not.toContain('SECRET')
  })
  it('private photo access checks staff and bounds actual JPEG bytes', async () => {
    const url = new NextRequest(`https://example.test/api/admin/moderation/${id}/photos/${id}?submission=${id}`)
    const params = { params: Promise.resolve({ id, photoId: id }) }
    m.reviewer.mockRejectedValue(new ModerationError('Not found', 404))
    expect((await GET(url, params)).status).toBe(404); expect(m.photo).not.toHaveBeenCalled()
    m.reviewer.mockResolvedValue({ id: 'staff' }); m.photo.mockResolvedValue(new Response(new Uint8Array([255, 216, 255])))
    const response = await GET(url, params)
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('private, no-store')
    m.photo.mockResolvedValue(new Response(new Uint8Array(2097153)))
    expect((await GET(url, params)).status).toBe(503)
  })
})
