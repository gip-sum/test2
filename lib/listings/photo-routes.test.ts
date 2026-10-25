import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import sharp from 'sharp'

/**
 * Every route that serves a listing photo (UI-19 public, UI-22 private):
 * access is checked before anything is read, a photo that is no longer
 * reachable (withdrawn, moderated, someone else's) is a 404, `?w=` takes
 * only an offered width and returns a resized JPEG, and every answer —
 * resized or not, success or refusal — is `private, no-store`, so no
 * shared cache can outlive the listing.
 */
const m = vi.hoisted(() => ({ published: vi.fn(), submitted: vi.fn(), draftUser: vi.fn(), photo: vi.fn(), verified: vi.fn(), reviewer: vi.fn(), review: vi.fn() }))
vi.mock('@/lib/listings/queries', () => ({ readPublishedPhoto: m.published, readSubmittedPhoto: m.submitted }))
vi.mock('@/lib/drafts/queries', () => ({ DraftError: class extends Error { constructor(message: string, public status = 503) { super(message) } }, draftUser: m.draftUser }))
vi.mock('@/lib/media/queries', () => ({ MediaError: class extends Error { constructor(message: string, public status = 503) { super(message) } }, readPhoto: m.photo }))
vi.mock('@/lib/auth/session', () => ({ getVerifiedUser: m.verified }))
vi.mock('@/lib/moderation/queries', () => ({ ModerationError: class extends Error { constructor(message: string, readonly status = 503) { super(message) } }, reviewerUser: m.reviewer, reviewPhoto: m.review }))

import { GET as publicPhoto } from '@/app/api/listings/[id]/photos/[photoId]/route'
import { GET as draftPhoto } from '@/app/api/posting/photos/[id]/route'
import { GET as submittedPhoto } from '@/app/api/posting/submissions/[id]/photos/[photoId]/route'
import { GET as adminPhoto } from '@/app/api/admin/moderation/[id]/photos/[photoId]/route'
import { DraftError } from '@/lib/drafts/queries'
import { MediaError } from '@/lib/media/queries'
import { ModerationError } from '@/lib/moderation/queries'

const id = 'a9140f33-a429-46f3-9514-3e8f32f18189', photoId = 'b9140f33-a429-46f3-9514-3e8f32f18189'
const original = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#557755' } }).jpeg().toBuffer()
const stored = () => new Response(new Uint8Array(original), { headers: { 'content-type': 'image/jpeg' } })
const width = async (r: Response) => (await sharp(Buffer.from(await r.arrayBuffer())).metadata()).width
const noStore = (r: Response) => r.headers.get('cache-control') === 'private, no-store'

const routes = [
  { name: 'public listing', url: `/api/listings/${id}/photos/${photoId}`, get: (u: string) => publicPhoto(new Request(`https://example.test${u}`), { params: Promise.resolve({ id, photoId }) }), read: m.published, gone: () => new DraftError('Photo not found.', 404) },
  { name: 'owner draft', url: `/api/posting/photos/${photoId}`, get: (u: string) => draftPhoto(new Request(`https://example.test${u}`), { params: Promise.resolve({ id: photoId }) }), read: m.photo, gone: () => new MediaError('Photo not found.', 404) },
  { name: 'owner submission', url: `/api/posting/submissions/${id}/photos/${photoId}`, get: (u: string) => submittedPhoto(new Request(`https://example.test${u}`), { params: Promise.resolve({ id, photoId }) }), read: m.submitted, gone: () => new DraftError('Photo not found.', 404) },
  { name: 'staff review', url: `/api/admin/moderation/${id}/photos/${photoId}?submission=${id}`, get: (u: string) => adminPhoto(new NextRequest(`https://example.test${u}`), { params: Promise.resolve({ id, photoId }) }), read: m.review, gone: () => new ModerationError('Photo not found.', 404) },
]
const sized = (url: string, w: string) => `${url}${url.includes('?') ? '&' : '?'}w=${w}`

beforeEach(() => {
  vi.clearAllMocks()
  m.draftUser.mockResolvedValue({ id: 'owner' }); m.verified.mockResolvedValue({ id: 'owner' }); m.reviewer.mockResolvedValue({ id: 'staff' })
  for (const r of routes) r.read.mockImplementation(async () => stored())
})

describe.each(routes)('$name photo route', (route) => {
  it('returns the original without `w`, and a resized JPEG at an offered width — both private, no-store', async () => {
    const full = await route.get(route.url)
    expect(full.status).toBe(200); expect(noStore(full)).toBe(true); expect(await width(full)).toBe(1600)
    const small = await route.get(sized(route.url, '320'))
    expect(small.status).toBe(200); expect(noStore(small)).toBe(true); expect(small.headers.get('content-type')).toBe('image/jpeg')
    expect(await width(small)).toBe(320)
  })
  it('refuses a width it does not offer, without enlarging or guessing', async () => {
    for (const w of ['333', '3200', '0320', 'x']) {
      const r = await route.get(sized(route.url, w))
      expect(r.status).toBe(404); expect(noStore(r)).toBe(true)
    }
  })
  it('answers 404, still no-store, for a photo that is no longer reachable (withdrawn, moderated, not yours)', async () => {
    route.read.mockRejectedValue(route.gone())
    for (const u of [route.url, sized(route.url, '320')]) {
      const r = await route.get(u)
      expect(r.status).toBe(404); expect(noStore(r)).toBe(true)
    }
  })
})

describe('access is checked before any photo is read, at any width', () => {
  it('a signed-out visitor gets nothing from the owner routes', async () => {
    m.verified.mockResolvedValue(null); m.draftUser.mockRejectedValue(new DraftError('Sign in', 401))
    for (const u of [routes[1]!.url, sized(routes[1]!.url, '320')]) expect((await routes[1]!.get(u)).status).toBe(401)
    for (const u of [routes[2]!.url, sized(routes[2]!.url, '320')]) expect((await routes[2]!.get(u)).status).toBe(401)
    expect(m.photo).not.toHaveBeenCalled(); expect(m.submitted).not.toHaveBeenCalled()
  })
  it('someone who is not staff gets the ordinary 404 from the review route', async () => {
    m.reviewer.mockRejectedValue(new ModerationError('Not found', 404))
    for (const u of [routes[3]!.url, sized(routes[3]!.url, '320')]) { const r = await routes[3]!.get(u); expect(r.status).toBe(404); expect(noStore(r)).toBe(true) }
    expect(m.review).not.toHaveBeenCalled()
  })
  it('a revoked staff role stops the very next request, sized or not', async () => {
    expect((await routes[3]!.get(sized(routes[3]!.url, '320'))).status).toBe(200)
    m.reviewer.mockRejectedValue(new ModerationError('Not found', 404))
    expect((await routes[3]!.get(sized(routes[3]!.url, '320'))).status).toBe(404)
  })
  it('the public route reads per request: a listing withdrawn between two requests is gone on the second', async () => {
    expect((await routes[0]!.get(sized(routes[0]!.url, '640'))).status).toBe(200)
    m.published.mockRejectedValue(new DraftError('Photo not found.', 404))
    expect((await routes[0]!.get(sized(routes[0]!.url, '640'))).status).toBe(404)
  })
})
