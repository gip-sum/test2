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
