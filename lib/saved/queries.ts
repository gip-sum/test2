import 'server-only'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE } from '@/lib/auth/session'
import { authConfig, type AuthUser } from '@/lib/auth/provider'

export type SavedRow = { property_public_id: string; created_at: string }
export type SavedResult = { ok: true; rows: SavedRow[] } | { ok: false }

async function request(user: AuthUser, method: 'GET' | 'POST' | 'DELETE', publicId?: string) {
  const config = authConfig()
  const token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!config || !token) return null
  const base = config.base.replace(/\/auth\/v1$/, '/rest/v1')
  const query = method === 'GET'
    ? `select=property_public_id,created_at&user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc`
    : method === 'POST'
      ? 'on_conflict=user_id,property_public_id'
      : `user_id=eq.${encodeURIComponent(user.id)}&property_public_id=eq.${encodeURIComponent(publicId ?? '')}`
  try {
    return await fetch(`${base}/saved_properties?${query}`, {
      method,
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(method === 'POST' ? { Prefer: 'resolution=ignore-duplicates,return=representation' } : {}),
      },
      ...(method === 'POST' ? { body: JSON.stringify({ user_id: user.id, property_public_id: publicId }) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
  } catch { return null }
}

export async function listSaved(user: AuthUser): Promise<SavedResult> {
  const response = await request(user, 'GET')
  if (!response?.ok) return { ok: false }
  try {
    const rows: unknown = await response.json()
    if (!Array.isArray(rows) || !rows.every((row) =>
      row && typeof row === 'object' && /^p_[a-z0-9]{1,32}$/.test(row.property_public_id) &&
      typeof row.created_at === 'string')) return { ok: false }
    return { ok: true, rows: rows as SavedRow[] }
  } catch { return { ok: false } }
}

export async function setSaved(user: AuthUser, publicId: string, save: boolean): Promise<boolean> {
  const response = await request(user, save ? 'POST' : 'DELETE', publicId)
  return response?.ok === true
}

// ── Saved real listings (Phase 20) ───────────────────────────────────────
// A different identity from the demo fixtures above: a Phase 18 listing id
// in its own table, saved through a database function that checks the
// listing is public and that the buyer is not its owner.
export type SavedListingRow = { listing_id: string; created_at: string }
/** `missing`: the Phase 20 migration has not been applied, so nothing can have been saved. */
export type SavedListingsResult = { ok: true; rows: SavedListingRow[] } | { ok: false; missing: boolean }
export type SaveListingResult = 'ok' | 'unavailable' | 'own' | 'limit' | 'error'
const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function listingRequest(path: string, method: 'GET' | 'POST' | 'DELETE', body?: object) {
  const config = authConfig(), token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!config || !token) return null
  try {
    return await fetch(`${config.base.replace(/\/auth\/v1$/, '/rest/v1')}/${path}`, {
      method, headers: { apikey: config.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store', signal: AbortSignal.timeout(8000),
    })
  } catch { return null }
}

export async function listSavedListings(user: AuthUser): Promise<SavedListingsResult> {
  const response = await listingRequest(`saved_listings?select=listing_id,created_at&user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc`, 'GET')
  if (!response?.ok) return { ok: false, missing: response?.status === 404 }
  try {
    const rows: unknown = await response.json()
    return Array.isArray(rows) && rows.every((r) => typeof r?.listing_id === 'string' && LISTING_ID.test(r.listing_id) && typeof r.created_at === 'string')
      ? { ok: true, rows: rows as SavedListingRow[] } : { ok: false, missing: false }
  } catch { return { ok: false, missing: false } }
}

export async function setSavedListing(user: AuthUser, listingId: string, save: boolean): Promise<SaveListingResult> {
  if (!LISTING_ID.test(listingId)) return 'unavailable'
  const response = save
    ? await listingRequest('rpc/save_listing', 'POST', { p_listing: listingId })
    : await listingRequest(`saved_listings?user_id=eq.${encodeURIComponent(user.id)}&listing_id=eq.${listingId}`, 'DELETE')
  if (response?.ok) return 'ok'
  // The database's PTxxx codes; see the Phase 20 migration.
  return response?.status === 410 ? 'unavailable' : response?.status === 403 ? 'own' : response?.status === 429 ? 'limit' : 'error'
}
