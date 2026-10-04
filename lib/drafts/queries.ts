import 'server-only'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE, getVerifiedUser } from '@/lib/auth/session'
import { authConfig, type AuthUser } from '@/lib/auth/provider'
import { DRAFT_KEYS, sameSnapshot, snapshotOf, type Draft, type Snapshot } from './types'

export class DraftError extends Error { constructor(message: string, public status = 503) { super(message) } }
async function request(path: string, method = 'GET', body?: unknown) {
  const config = authConfig(), token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!config || !token) throw new DraftError('Sign in to save your draft.', 401)
  try {
    return await fetch(config.base.replace(/\/auth\/v1$/, '') + '/rest/v1/' + path, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { apikey: config.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, cache: 'no-store', signal: AbortSignal.timeout(15000) })
  } catch { throw new DraftError('Draft storage could not be reached. Your changes are not saved to your account.') }
}
const filter = (user: AuthUser) => `owner_id=eq.${encodeURIComponent(user.id)}`
export async function draftUser() {
  const user = await getVerifiedUser()
  if (!user) throw new DraftError('Sign in again to save your draft.', 401)
  return user
}
export async function listDrafts(user: AuthUser): Promise<Draft[]> {
  const r = await request(`property_drafts?${filter(user)}&order=updated_at.desc&limit=50`)
  if (!r.ok) throw new DraftError('Your drafts could not be loaded. Please retry.')
  return r.json()
}
export async function getDraft(user: AuthUser, id: string): Promise<Draft> {
  const r = await request(`property_drafts?${filter(user)}&id=eq.${id}`)
  if (!r.ok) throw new DraftError('Your draft could not be loaded. Please retry.')
  const row = (await r.json() as Draft[])[0]
  if (!row) throw new DraftError('Draft not found.', 404)
  return row
}
const fields = (s: Snapshot) => ({ page_path: s.path, ...Object.fromEntries(DRAFT_KEYS.map(k => [k, s.input[k] ?? null])) })
export async function createDraft(user: AuthUser, id: string, collection: string, snapshot: Snapshot): Promise<Draft> {
  const r = await request('property_drafts', 'POST', { id, owner_id: user.id, collection_id: collection, ...fields(snapshot) })
  if (r.status === 409) {
    const row = await getDraft(user, id)
    if (row.collection_id !== collection) throw new DraftError('This photo collection is already linked to another draft.', 409)
    return row // Same creation ID: never overwrite a draft after a lost response.
  }
  if (!r.ok) throw new DraftError('Could not create a draft. Retry, or check the limit of 50 drafts per account.')
  const row = (await r.json() as Draft[])[0]
  if (!row) throw new DraftError('Draft creation was not confirmed. Please retry.')
  return row
}
export async function saveDraft(user: AuthUser, id: string, revision: number, snapshot: Snapshot): Promise<Draft> {
  const r = await request(`property_drafts?${filter(user)}&id=eq.${id}&revision=eq.${revision}`, 'PATCH', fields(snapshot))
  if (!r.ok) throw new DraftError('Draft could not be saved. Please retry.')
  const row = (await r.json() as Draft[])[0]
  if (row) return row
  const current = await getDraft(user, id)
  if (sameSnapshot(snapshotOf(current), snapshot)) return current // Safe retry after a lost response.
  throw new DraftError('This draft changed in another tab or device. Load the latest version before editing further.', 409)
}
