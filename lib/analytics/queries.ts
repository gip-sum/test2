import 'server-only'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE } from '@/lib/auth/session'
import { authConfig, type AuthUser } from '@/lib/auth/provider'
import { loadDashboard } from '@/lib/dashboard/queries'
import type { PropertyCard } from '@/lib/dashboard/model'
import { kolkataToday } from '@/lib/posting/details'
import { addDays, type ActivityRow, type Range, type SaveCount } from './model'

/**
 * Everything the performance pages read, with the seller's own session.
 *
 * The property cards come from the dashboard's own loader, so a listing's
 * title and status here can never disagree with My properties. Activity is
 * essential (without it there is nothing to show); save counts are
 * supplementary and degrade to "unavailable" on their own.
 */
export type PerformanceData =
  | { ok: true; cards: PropertyCard[]; activity: ActivityRow[]; saveCounts: SaveCount[] | null; viewsSince: string | null; today: string }
  | { ok: false; reason: 'dashboard' | 'not-ready' | 'activity' }

async function rest(path: string, body?: object) {
  const config = authConfig(), token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!config || !token) return null
  try {
    return await fetch(`${config.base.replace(/\/auth\/v1$/, '/rest/v1')}/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { apikey: config.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store', signal: AbortSignal.timeout(10000),
    })
  } catch { return null }
}
const DAY = /^\d{4}-\d{2}-\d{2}$/
const count = (n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0

export async function loadPerformance(user: AuthUser, range: Range): Promise<PerformanceData> {
  const today = kolkataToday()
  // The current period and the one before it, in one read.
  const [dashboard, activityResponse, savesResponse, metaResponse] = await Promise.all([
    loadDashboard(user),
    rest('rpc/seller_listing_activity', { p_from: addDays(today, -(2 * range - 1)), p_to: today }),
    rest('rpc/seller_listing_save_counts', {}),
    rest('listing_analytics_meta?select=views_since'),
  ])
  if (!dashboard.ok) return { ok: false, reason: 'dashboard' }
  // 404: the Phase 20 function does not exist yet (migration not applied).
  if (!activityResponse?.ok) return { ok: false, reason: activityResponse?.status === 404 ? 'not-ready' : 'activity' }
  let activity: ActivityRow[]
  try {
    const rows: unknown = await activityResponse.json()
    if (!Array.isArray(rows) || !rows.every((r) => typeof r?.listing_id === 'string' && typeof r.day === 'string' && DAY.test(r.day) && count(r.views) && count(r.enquiries))) return { ok: false, reason: 'activity' }
    activity = rows as ActivityRow[]
  } catch { return { ok: false, reason: 'activity' } }
  let saveCounts: SaveCount[] | null = null
  try {
    const rows: unknown = savesResponse?.ok ? await savesResponse.json() : null
    if (Array.isArray(rows) && rows.every((r) => typeof r?.listing_id === 'string' && count(r.saves))) saveCounts = rows as SaveCount[]
  } catch { /* Saves shown as unavailable. */ }
  let viewsSince: string | null = null
  try {
    const rows: unknown = metaResponse?.ok ? await metaResponse.json() : null
    const at = Array.isArray(rows) && typeof rows[0]?.views_since === 'string' ? new Date(rows[0].views_since) : null
    if (at && !Number.isNaN(at.getTime())) viewsSince = kolkataToday(at)
  } catch { /* Without a start date every day reads "not tracked": never a false zero. */ }
  return { ok: true, cards: dashboard.cards, activity, saveCounts, viewsSince, today }
}
