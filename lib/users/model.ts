import { UUID } from '@/lib/media/types'

export const USER_PAGE_SIZE = 25
export const ACCOUNT_STATUSES = ['ACTIVE', 'SUSPENDED'] as const
export const SELLER_ROLES = ['OWNER', 'AGENT', 'BUILDER'] as const
export type AccountStatus = typeof ACCOUNT_STATUSES[number]
export type SellerRole = typeof SELLER_ROLES[number]
export type UserQuery = { q: string; status: string; role: string; page: number }
export type HistoryQuery = { listings: number; leads: number; changes: number }
export const pageNumber = (v: unknown) => typeof v === 'string' && /^[1-9]\d{0,4}$/.test(v) ? Number(v) : 1
export function parseUserQuery(p: Record<string, string | string[] | undefined>): UserQuery {
  return { q: typeof p.q === 'string' ? p.q.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 100) : '',
    status: ACCOUNT_STATUSES.some(s => s === p.status) ? p.status as string : '',
    role: p.role === 'unassigned' || SELLER_ROLES.some(r => r === p.role) ? p.role as string : '', page: pageNumber(p.page) }
}
export function usersHref(q: Partial<UserQuery> = {}) {
  const p = new URLSearchParams()
  if (q.q) p.set('q', q.q)
  if (q.status) p.set('status', q.status)
  if (q.role) p.set('role', q.role)
  if (q.page && q.page > 1) p.set('page', String(q.page))
  return '/admin/users' + (p.size ? '?' + p : '')
}
export function userHref(id: string, h: Partial<HistoryQuery> = {}) {
  const p = new URLSearchParams()
  for (const k of ['listings', 'leads', 'changes'] as const) if (h[k] && h[k]! > 1) p.set(k, String(h[k]))
  return '/admin/users/' + id + (p.size ? '?' + p : '')
}
export type ManagedAccount = {
  id: string; email: string | null; full_name: string | null; created_at: string; last_sign_in_at: string | null
  status: AccountStatus; seller_role: SellerRole | null; version: number; staff_role: string | null
}
export type AccountChange = {
  id: string; actor_id: string; reason: string; status_before: AccountStatus; status_after: AccountStatus
  role_before: SellerRole | null; role_after: SellerRole | null; version_before: number; version_after: number; created_at: string
}
export type PageOf<T> = { rows: T[]; total: number; page: number }
export type UserListing = { id: string; title: string; status: string; seller_type: SellerRole; created_at: string }
export type UserLead = { id: string; listing_id: string | null; listing_title: string; direction: 'sent' | 'received' | 'both'; status: string; created_at: string }
export type AccountDetail = {
  account: ManagedAccount; contact_phone: string | null; preferred_intent: string | null
  listings: PageOf<UserListing>; leads: PageOf<UserLead>; changes: PageOf<AccountChange>
}
export type AccountInput = { user: string; version: number; status: AccountStatus; role: SellerRole | null; reason: string; request: string; accepted: true }
export const MAX_ACCOUNT_BYTES = 8192
export function accountInput(value: unknown): AccountInput | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.user !== 'string' || !UUID.test(v.user) || typeof v.request !== 'string' || !UUID.test(v.request)
    || !Number.isSafeInteger(v.version) || Number(v.version) < 0 || Number(v.version) >= 2147483647
    || !ACCOUNT_STATUSES.some(s => s === v.status) || !(v.role === null || SELLER_ROLES.some(r => r === v.role))
    || v.accepted !== true || typeof v.reason !== 'string') return null
  const reason = v.reason.trim()
  if (Array.from(reason).length < 5 || Array.from(reason).length > 2000 || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(reason)) return null
  return { user: v.user, version: Number(v.version), status: v.status as AccountStatus, role: v.role as SellerRole | null, reason, request: v.request, accepted: true }
}
