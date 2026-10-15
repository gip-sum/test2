import 'server-only'
import { cookies } from 'next/headers'
import { authConfig, type AuthUser } from '@/lib/auth/provider'
import { ACCESS_COOKIE, getVerifiedUser } from '@/lib/auth/session'
import { staffRole } from '@/lib/admin/queries'
import { UUID } from '@/lib/media/types'
import { ACCOUNT_STATUSES, SELLER_ROLES, type ManagedAccount, type PageOf, type AccountDetail, type AccountInput, type UserQuery, type HistoryQuery } from './model'

export class AccountError extends Error {
  constructor(message: string, readonly status = 503) { super(message) }
}
export async function accountAdmin(): Promise<AuthUser> {
  const user = await getVerifiedUser()
  if (!user) throw new AccountError('Sign in before managing accounts.', 401)
  if (await staffRole() !== 'ADMIN') throw new AccountError('Account not found.', 404)
  return user
}
async function rpc(name: string, body: object): Promise<unknown> {
  const config = authConfig(), token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!config || !token) throw new AccountError('Sign in before managing accounts.', 401)
  let response: Response
  try {
    response = await fetch(config.base.replace(/\/auth\/v1$/, '/rest/v1/rpc/') + name, {
      method: 'POST', headers: { apikey: config.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(10000),
    })
  } catch { throw new AccountError('Account storage could not be reached. Retry or refresh.') }
  let data: unknown
  try { data = await response.json() } catch { throw new AccountError('Account storage returned an invalid response.') }
  if (!response.ok) {
    const code = data && typeof data === 'object' && 'code' in data ? data.code : null
    if (['42501', 'P0002'].includes(String(code)) || [401, 403, 404].includes(response.status)) throw new AccountError('Account not found or cannot be managed.', 404)
    if (code === '40001' || response.status === 409) throw new AccountError('This account or request changed. Refresh the account before changing it again.', 409)
    if (code === '22023') throw new AccountError('Choose a change and enter a reason of 5–2,000 characters.', 400)
    throw new AccountError('The account could not be loaded or saved. Retry or refresh.')
  }
  return data
}
const nullableText = (v: unknown) => v === null || typeof v === 'string'
function account(value: unknown): ManagedAccount {
  const v = value as ManagedAccount | null
  if (!v || !UUID.test(v.id) || !nullableText(v.email) || !nullableText(v.full_name) || typeof v.created_at !== 'string'
    || !nullableText(v.last_sign_in_at) || !ACCOUNT_STATUSES.includes(v.status) || !(v.seller_role === null || SELLER_ROLES.includes(v.seller_role))
    || !Number.isSafeInteger(v.version) || v.version < 0 || typeof v.operator_managed !== 'boolean' || !(v.staff_role === null || ['ADMIN', 'MODERATOR'].includes(v.staff_role))) throw new AccountError('Account details returned an invalid response.')
  return { id: v.id, email: v.email, full_name: v.full_name, created_at: v.created_at, last_sign_in_at: v.last_sign_in_at, status: v.status, seller_role: v.seller_role, version: v.version, staff_role: v.staff_role, operator_managed: v.operator_managed }
}
function page<T>(value: unknown, project: (r: T) => T): PageOf<T> {
  const v = value as PageOf<T> | null
  if (!v || !Array.isArray(v.rows) || v.rows.length > 25 || !Number.isSafeInteger(v.total) || v.total < v.rows.length || !Number.isSafeInteger(v.page) || v.page < 1) throw new AccountError('Account history returned an invalid response.')
  return { rows: v.rows.map(project), total: v.total, page: v.page }
}
export async function searchAccounts(q: UserQuery): Promise<PageOf<ManagedAccount>> {
  return page(await rpc('admin_users', { p_q: q.q, p_status: q.status, p_role: q.role, p_page: q.page }), account)
}
export async function getAccount(id: string, h: HistoryQuery): Promise<AccountDetail> {
  if (!UUID.test(id)) throw new AccountError('Account not found.', 404)
  const v = await rpc('admin_user', { p_user: id, p_listings: h.listings, p_leads: h.leads, p_changes: h.changes }) as AccountDetail | null
  if (!v || v.account?.id !== id || !nullableText(v.contact_phone) || !nullableText(v.preferred_intent)) throw new AccountError('Account details returned an invalid response.')
  return { account: account(v.account), contact_phone: v.contact_phone, preferred_intent: v.preferred_intent,
    listings: page(v.listings, r => {
      if (!UUID.test(r.id) || typeof r.title !== 'string' || typeof r.status !== 'string' || !SELLER_ROLES.includes(r.seller_type) || typeof r.created_at !== 'string') throw new AccountError('Listing history returned an invalid response.')
      return { id: r.id, title: r.title, status: r.status, seller_type: r.seller_type, created_at: r.created_at }
    }),
    leads: page(v.leads, r => {
      if (!UUID.test(r.id) || !(r.listing_id === null || UUID.test(r.listing_id)) || typeof r.listing_title !== 'string' || !['sent', 'received', 'both'].includes(r.direction) || !['new', 'contacted', 'closed'].includes(r.status) || typeof r.created_at !== 'string') throw new AccountError('Lead activity returned an invalid response.')
      return { id: r.id, listing_id: r.listing_id, listing_title: r.listing_title, direction: r.direction, status: r.status, created_at: r.created_at }
    }),
    changes: page(v.changes, r => {
      if (!UUID.test(r.id) || !UUID.test(r.actor_id) || typeof r.reason !== 'string' || !ACCOUNT_STATUSES.includes(r.status_before) || !ACCOUNT_STATUSES.includes(r.status_after)
        || !(r.role_before === null || SELLER_ROLES.includes(r.role_before)) || !(r.role_after === null || SELLER_ROLES.includes(r.role_after))
        || !Number.isSafeInteger(r.version_before) || r.version_after !== r.version_before + 1 || typeof r.created_at !== 'string') throw new AccountError('Account changes returned an invalid response.')
      return { id: r.id, actor_id: r.actor_id, reason: r.reason, status_before: r.status_before, status_after: r.status_after, role_before: r.role_before, role_after: r.role_after, version_before: r.version_before, version_after: r.version_after, created_at: r.created_at }
    }) }
}
export async function manageAccount(input: AccountInput): Promise<void> {
  const v = await rpc('manage_account', { p_user: input.user, p_version: input.version, p_status: input.status, p_role: input.role, p_reason: input.reason, p_request: input.request }) as { id?: string; version?: number } | null
  if (!v || v.id !== input.request || v.version !== input.version + 1) throw new AccountError('Change could not be confirmed. Retry the same change.')
}
