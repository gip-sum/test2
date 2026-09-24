import 'server-only'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE } from '@/lib/auth/session'
import { authConfig, type AuthUser } from '@/lib/auth/provider'
import type { BuyerProfileInput } from './validation'

export type BuyerProfile = BuyerProfileInput & { id: string; updated_at: string }
export type ProfileResult = { ok: true; profile: BuyerProfile | null } | { ok: false }

function restConfig() {
  const config = authConfig()
  return config ? { base: config.base.replace(/\/auth\/v1$/, '/rest/v1'), key: config.key } : null
}

async function profileRequest(user: AuthUser, method: 'GET' | 'POST', body?: BuyerProfileInput): Promise<Response | null> {
  const config = restConfig()
  const token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!config || !token) return null
  try {
    const query = method === 'GET'
      ? `select=id,full_name,contact_phone,preferred_intent,preferred_locality,email_updates,updated_at&id=eq.${encodeURIComponent(user.id)}`
      : 'on_conflict=id'
    return await fetch(`${config.base}/buyer_profiles?${query}`, {
      method,
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(method === 'POST' ? { Prefer: 'resolution=merge-duplicates,return=representation' } : {}),
      },
      ...(body ? { body: JSON.stringify({ ...body, id: user.id, updated_at: new Date().toISOString() }) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
  } catch { return null }
}

function isProfile(value: unknown, id: string): value is BuyerProfile {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<BuyerProfile>
  return p.id === id && typeof p.full_name === 'string' &&
    (p.contact_phone === null || typeof p.contact_phone === 'string') &&
    (p.preferred_locality === null || typeof p.preferred_locality === 'string') &&
    ['buy', 'rent', 'both'].includes(p.preferred_intent ?? '') &&
    typeof p.email_updates === 'boolean' && typeof p.updated_at === 'string'
}

export async function getBuyerProfile(user: AuthUser): Promise<ProfileResult> {
  const response = await profileRequest(user, 'GET')
  if (!response?.ok) return { ok: false }
  try {
    const rows: unknown = await response.json()
    if (!Array.isArray(rows) || rows.length > 1 || (rows.length === 1 && !isProfile(rows[0], user.id))) return { ok: false }
    return { ok: true, profile: rows.length ? rows[0] as BuyerProfile : null }
  } catch { return { ok: false } }
}

export async function saveBuyerProfile(user: AuthUser, input: BuyerProfileInput): Promise<boolean> {
  const response = await profileRequest(user, 'POST', input)
  if (!response?.ok) return false
  try {
    const rows: unknown = await response.json()
    return Array.isArray(rows) && rows.length === 1 && isProfile(rows[0], user.id)
  } catch { return false }
}
