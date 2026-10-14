import 'server-only'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { ACCESS_COOKIE, getVerifiedUser } from '@/lib/auth/session'
import { authConfig, type AuthUser } from '@/lib/auth/provider'
import { ADMIN_FILTERS, ADMIN_PAGE_SIZE, ADMIN_STATUSES, type AdminFilter, type AdminListing, type AdminOverview, type DatabaseStatus } from './model'

/**
 * The only module that knows where admin data comes from. Every read uses
 * the signed-in staff member's own session; the database functions check
 * staff membership again themselves, so nothing here is the only gate.
 */
async function rpc(name: string, body: object = {}) {
  const config = authConfig(), token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!config || !token) return null
  try {
    return await fetch(`${config.base.replace(/\/auth\/v1$/, '/rest/v1')}/rpc/${name}`, {
      method: 'POST', headers: { apikey: config.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(10000),
    })
  } catch { return null }
}
async function json(response: Response | null): Promise<unknown> {
  if (!response?.ok) return undefined
  try { return await response.json() } catch { return undefined }
}

export type StaffRole = 'ADMIN'
/** The caller's active staff role, or null — including when it cannot be read. */
export async function staffRole(): Promise<StaffRole | null> {
  const role = await json(await rpc('my_staff_role'))
  return role === 'ADMIN' ? role : null
}

/**
 * Every admin page starts here. Signed out: log in and come back. Signed in
 * but not active staff, or staff that cannot be confirmed: the ordinary 404,
 * so the console is not advertised to anyone who cannot use it.
 */
/** `now` is the request's reference time, so every wait on a page is measured from one instant. */
export async function requireStaff(path: string): Promise<{ user: AuthUser; role: StaffRole; now: number }> {
  const user = await getVerifiedUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`)
  const role = await staffRole()
  if (!role) notFound()
  return { user, role, now: Date.now() }
}

const count = (n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0
const counts = (o: unknown, keys: readonly string[]) => !!o && typeof o === 'object' && keys.every((k) => count((o as Record<string, unknown>)[k]))

export async function adminOverview(): Promise<AdminOverview | null> {
  const o = await json(await rpc('admin_overview')) as AdminOverview | undefined
  if (!o || typeof o.listings !== 'object' || !Object.entries(o.listings).every(([k, v]) => (ADMIN_STATUSES as readonly string[]).includes(k) && count(v))) return null
  if (!count(o.drafts_never_submitted) || !counts(o.queue, ['waiting']) || !counts(o.leads, ['last_7_days', 'last_30_days', 'real_listings_30_days', 'no_seller_30_days', 'untouched_over_2_days']) || !counts(o.users, ['total', 'new_7_days', 'with_listings', 'staff'])) return null
  return o
}

export async function adminListings(filter: AdminFilter, page: number): Promise<{ rows: AdminListing[]; total: number } | null> {
  const status = ADMIN_FILTERS.find((f) => f.key === filter)?.status ?? null
  const rows = await json(await rpc('admin_listings', { p_status: status, p_limit: ADMIN_PAGE_SIZE, p_offset: (page - 1) * ADMIN_PAGE_SIZE }))
  if (!Array.isArray(rows) || !rows.every((r) => typeof r?.id === 'string' && (ADMIN_STATUSES as readonly string[]).includes(r.status) && typeof r.title === 'string' && typeof r.submitted_at === 'string')) return null
  // A page past the end returns no rows, and so no total: ask for page one's.
  if (!rows.length && page > 1) {
    const first = await adminListings(filter, 1)
    return first && { rows: [], total: first.total }
  }
  return { rows: rows.map((r) => ({ ...r, price: Number(r.price), total: Number(r.total) })) as AdminListing[], total: rows.length ? Number(rows[0].total) : 0 }
}

export async function adminSystemStatus(): Promise<{ status: DatabaseStatus; ms: number } | null> {
  const started = Date.now()
  const s = await json(await rpc('admin_system_status')) as DatabaseStatus | undefined
  const ms = Date.now() - started
  if (!s || !count(s.expiry_backlog) || typeof s.checked_at !== 'string' || (s.migrations !== null && !Array.isArray(s.migrations))) return null
  return { status: s, ms }
}
