import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'reviewer-token' }) }) }))
vi.mock('@/lib/auth/provider', () => ({ authConfig: () => ({ base: 'https://test.invalid/auth/v1', key: 'public-key' }) }))
const m = vi.hoisted(() => ({ user: vi.fn(), role: vi.fn() }))
vi.mock('@/lib/auth/session', () => ({ ACCESS_COOKIE: 'gb-access', getVerifiedUser: m.user }))
vi.mock('@/lib/admin/queries', () => ({ staffRole: m.role }))
import { decideListing, getReview, moderationQueue, reviewerUser, reviewPhoto } from './queries'
import type { DecisionInput } from './model'
const id = 'a9140f33-a429-46f3-9514-3e8f32f18189', input = { listing: id, submission: id, version: 2, action: 'APPROVE', days: 90, reason: null, request: id, accepted: true } as DecisionInput
let reply: Response
beforeEach(() => { vi.clearAllMocks(); m.user.mockResolvedValue({ id }); m.role.mockResolvedValue('MODERATOR'); vi.stubGlobal('fetch', vi.fn(async () => reply)) })
afterEach(() => vi.unstubAllGlobals())
describe('moderation data seam', () => {
  it('requires a verified user and an active staff role', async () => {
    m.user.mockResolvedValue(null); await expect(reviewerUser()).rejects.toMatchObject({ status: 401 })
    m.user.mockResolvedValue({ id }); m.role.mockResolvedValue(null); await expect(reviewerUser()).rejects.toMatchObject({ status: 404 })
    m.role.mockResolvedValue('MODERATOR'); expect(await reviewerUser()).toEqual({ id })
  })
  it('reads truthful queue totals and pages using the reviewer JWT', async () => {
    reply = Response.json({ rows: [{ id, title: 'SAMPLE listing', status: 'UNDER_REVIEW' }], total: 26 })
    expect(await moderationQueue(2)).toMatchObject({ total: 26 })
    const call = vi.mocked(fetch).mock.calls[0]!
    expect(call[0]).toBe('https://test.invalid/rest/v1/rpc/moderation_queue')
    expect(call[1]?.headers).toMatchObject({ Authorization: 'Bearer reviewer-token', apikey: 'public-key' })
    expect(call[1]?.cache).toBe('no-store'); expect(JSON.parse(call[1]?.body as string)).toEqual({ p_limit: 25, p_offset: 25 })
    reply = Response.json({ rows: [], total: -1 }); await expect(moderationQueue(1)).rejects.toThrow('invalid response')
  })
  it('checks the bound saved copy and limits the photo projection', async () => {
    const review = { listing: { id, owner_id: id, current_submission_id: id, version: 2, status: 'UNDER_REVIEW' }, submission: { id, listing_id: id, title: 'SAMPLE copy' }, photos: [{ id, submission_id: id, position: 0, object_path: 'PRIVATE-PATH', source_id: 'PRIVATE' }], history: [] }
    reply = Response.json(review)
    expect((await getReview(id)).photos[0]).not.toHaveProperty('source_id')
    reply = Response.json({ ...review, submission: { ...review.submission, id: 'foreign' } }); await expect(getReview(id)).rejects.toThrow('invalid response')
  })
  it('checks idempotent decision identity and maps conflicts without raw errors', async () => {
    reply = Response.json({ id, listing_id: id, submission_id: id, action: 'APPROVE' }); expect(await decideListing(input)).toMatchObject({ id })
    reply = Response.json({ code: '40001', message: 'SECRET' }, { status: 409 }); await expect(decideListing(input)).rejects.toMatchObject({ status: 409 })
    reply = Response.json({ code: '42501', message: 'SECRET' }, { status: 403 }); await expect(decideListing(input)).rejects.toMatchObject({ status: 404 })
    reply = Response.json({ id: 'foreign' }); await expect(decideListing(input)).rejects.toThrow('confirmation was invalid')
  })
  it('requires an exact authorised immutable photo path and reads storage as reviewer', async () => {
    reply = Response.json('foreign/path.jpg'); await expect(reviewPhoto(id, id, id)).rejects.toMatchObject({ status: 404 })
    vi.mocked(fetch).mockReset().mockResolvedValueOnce(Response.json(`${id}/${id}.jpg`)).mockResolvedValueOnce(new Response(new Uint8Array([255, 216, 255]), { headers: { 'Content-Type': 'image/jpeg' } }))
    expect((await reviewPhoto(id, id, id)).ok).toBe(true)
    expect(vi.mocked(fetch).mock.calls[1]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer reviewer-token' })
  })
})
