import 'server-only'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE, getVerifiedUser } from '@/lib/auth/session'
import { authConfig, type AuthUser } from '@/lib/auth/provider'
import { staffRole } from '@/lib/admin/queries'
import { ADMIN_PAGE_SIZE, type AdminListing } from '@/lib/admin/model'
import { UUID } from '@/lib/media/types'
import { LISTING_STATUS } from '@/lib/listings/types'
import { REVIEW_ACTIONS, type DecisionInput, type ModerationAction, type Review } from './model'

export class ModerationError extends Error {
  constructor(message: string, readonly status = 503) { super(message) }
}

export async function reviewerUser(): Promise<AuthUser> {
  const user = await getVerifiedUser()
  if (!user) throw new ModerationError('Sign in before reviewing a listing.', 401)
  if (!await staffRole()) throw new ModerationError('Review not found.', 404)
  return user
}

async function request(path: string, body?: object): Promise<Response> {
  const config = authConfig(), token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!config || !token) throw new ModerationError('Sign in before reviewing a listing.', 401)
  try {
    return await fetch(config.base.replace(/\/auth\/v1$/, '') + path, {
      method: body ? 'POST' : 'GET', headers: { apikey: config.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(15000),
    })
  } catch { throw new ModerationError('Review storage could not be reached. Retry the same decision or refresh.') }
}

async function rpc(name: string, body: object): Promise<unknown> {
  const response = await request('/rest/v1/rpc/' + name, body)
  let data: unknown
  try { data = await response.json() } catch { throw new ModerationError('Review storage returned an invalid response.') }
  if (!response.ok) {
    const code = data && typeof data === 'object' && 'code' in data ? data.code : null
    if (code === '42501' || response.status === 401 || response.status === 403) throw new ModerationError('Review not found.', 404)
    if (code === 'P0002') throw new ModerationError('Review not found.', 404)
    if (code === '40001' || response.status === 409) throw new ModerationError('This listing or decision changed. Refresh before reviewing it again.', 409)
    if (code === '22023') throw new ModerationError('Check the reason, validity and confirmation before trying again.', 400)
    throw new ModerationError('The review could not be loaded or saved. Retry the same decision or refresh.')
  }
  return data
}

export async function moderationQueue(page: number): Promise<{ rows: AdminListing[]; total: number }> {
  const data = await rpc('moderation_queue', { p_limit: ADMIN_PAGE_SIZE, p_offset: (page - 1) * ADMIN_PAGE_SIZE }) as { rows?: AdminListing[]; total?: number } | null
  if (!data || !Number.isSafeInteger(data.total) || data.total! < 0 || !Array.isArray(data.rows) || !data.rows.every(r => UUID.test(r.id) && r.status === 'UNDER_REVIEW' && typeof r.title === 'string')) throw new ModerationError('The review queue returned an invalid response.')
  return { rows: data.rows, total: data.total! }
}

export async function getReview(id: string): Promise<Review> {
  if (!UUID.test(id)) throw new ModerationError('Review not found.', 404)
  const data = await rpc('moderation_review', { p_listing: id }) as Review | null
  if (!data || data.listing?.id !== id || !UUID.test(data.listing.owner_id) || !Number.isSafeInteger(data.listing.version)
    || !(LISTING_STATUS as readonly string[]).includes(data.listing.status) || data.submission?.id !== data.listing.current_submission_id
    || data.submission?.listing_id !== id || typeof data.submission.title !== 'string' || !Array.isArray(data.photos) || !Array.isArray(data.history)) throw new ModerationError('The submitted copy returned an invalid response.')
  if (!data.photos.every(p => UUID.test(p.id) && p.submission_id === data.submission.id && Number.isInteger(p.position))) throw new ModerationError('Submitted photos returned an invalid response.')
  // Explicit public projection: a provider response cannot accidentally add
  // private profile fields to the rendered review or client component props.
  return { listing: data.listing, submission: data.submission, photos: data.photos.map(p => ({ id: p.id, submission_id: p.submission_id, object_path: '', position: p.position, width: p.width, height: p.height, bytes: p.bytes })), history: data.history }
}

export async function decideListing(input: DecisionInput): Promise<ModerationAction> {
  const data = await rpc('moderation_decide', { p_listing: input.listing, p_submission: input.submission, p_version: input.version, p_action: input.action, p_reason: input.reason, p_days: input.days, p_request: input.request }) as ModerationAction | null
  if (!data || data.id !== input.request || data.listing_id !== input.listing || data.submission_id !== input.submission || data.action !== input.action || !(REVIEW_ACTIONS as readonly string[]).includes(data.action)) throw new ModerationError('Decision confirmation was invalid. Retry the same decision.')
  return data
}

export async function reviewPhoto(id: string, submission: string, photo: string): Promise<Response> {
  if (![id, submission, photo].every(v => UUID.test(v))) throw new ModerationError('Photo not found.', 404)
  const path = await rpc('moderation_photo', { p_listing: id, p_submission: submission, p_photo: photo })
  if (path !== `${submission}/${photo}.jpg`) throw new ModerationError('Photo not found.', 404)
  const response = await request(`/storage/v1/object/authenticated/listing-photos/${path}`)
  if (!response.ok) throw new ModerationError('Submitted photo could not be loaded.', [400, 403, 404].includes(response.status) ? 404 : 503)
  if (response.headers.get('content-type')?.split(';')[0] !== 'image/jpeg' || Number(response.headers.get('content-length') ?? 0) > 2097152) throw new ModerationError('Submitted photo is invalid.')
  return response
}
