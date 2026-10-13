import 'server-only'
import { cookies } from 'next/headers'
import { authConfig, type AuthUser } from '@/lib/auth/provider'
import { ACCESS_COOKIE } from '@/lib/auth/session'
import { getPropertyDetail } from '@/lib/property/queries'
import { validateEnquiry } from './validate'
import type { EnquiryInput, EnquiryFieldError } from './types'
import { UUID } from '@/lib/media/types'

export type Lead = {
  id: string
  /** Exactly one of these is set: a demo fixture's public id, or a Phase 18 listing. */
  listing_public_id: string | null
  listing_id: string | null
  listing_title: string
  buyer_name: string
  buyer_phone: string
  message: string | null
  duplicate_of: string | null
  status: 'new' | 'contacted' | 'closed'
  created_at: string
}
export type LeadEvent = { enquiry_id: string; event_type: 'created' | 'repeated' | 'status_changed'; status: Lead['status']; created_at: string }
export type LeadList = { ok: true; rows: Lead[] } | { ok: false }

async function request(path: string, init: { method?: 'GET' | 'POST' | 'PATCH'; body?: object }, user?: AuthUser | null) {
  const config = authConfig()
  if (!config) return null
  const token = user ? (await cookies()).get(ACCESS_COOKIE)?.value : null
  if (user && !token) return null
  try {
    return await fetch(`${config.base.replace(/\/auth\/v1$/, '/rest/v1')}/${path}`, {
      method: init.method ?? 'GET',
      headers: { apikey: config.key, Authorization: `Bearer ${token ?? config.key}`, 'Content-Type': 'application/json' },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    })
  } catch { return null }
}

export async function recordLead(input: EnquiryInput, user: AuthUser | null): Promise<
  { ok: true; duplicate: boolean; sellerNotified: boolean } |
  { ok: false; errors: Partial<Record<EnquiryFieldError, string>> }
> {
  const { errors, name, phone, message } = validateEnquiry(input)
  if (Object.keys(errors).length) return { ok: false, errors }
  const listing = getPropertyDetail(input.listingPublicId)
  if (!listing) return { ok: false, errors: { listing: 'This property is no longer available.' } }
  const response = await request('rpc/submit_enquiry', {
    method: 'POST', body: {
      p_listing_public_id: listing.publicId,
      p_listing_title: listing.society ?? listing.title,
      p_name: name, p_phone: phone, p_message: message ?? null,
    },
  }, user)
  if (!response?.ok) return { ok: false, errors: { listing: response?.status === 400 ? 'Too many recent enquiries for this number. Please try again later.' : 'Your enquiry could not be saved. Please try again.' } }
  try {
    const rows: unknown = await response.json()
    if (!Array.isArray(rows) || rows.length !== 1 || typeof rows[0]?.repeated !== 'boolean' || typeof rows[0]?.seller_notified !== 'boolean') throw new Error('Invalid response')
    return { ok: true, duplicate: rows[0].repeated, sellerNotified: rows[0].seller_notified }
  } catch { return { ok: false, errors: { listing: 'Your enquiry could not be confirmed. Please try again.' } } }
}

function validLead(row: unknown): row is Lead {
  if (!row || typeof row !== 'object') return false
  const lead = row as Partial<Lead>
  return typeof lead.id === 'string' &&
    (typeof lead.listing_public_id === 'string' || typeof lead.listing_id === 'string') &&
    typeof lead.listing_title === 'string' && typeof lead.buyer_name === 'string' &&
    typeof lead.buyer_phone === 'string' && ['new', 'contacted', 'closed'].includes(lead.status ?? '') &&
    typeof lead.created_at === 'string'
}

const LEAD_COLUMNS = 'id,listing_public_id,listing_title,buyer_name,buyer_phone,message,duplicate_of,status,created_at'

export async function listLeads(user: AuthUser, view: 'buyer' | 'seller', options: { listingId?: string } = {}): Promise<LeadList> {
  const field = view === 'buyer' ? 'buyer_id' : 'seller_id'
  if (options.listingId !== undefined && !UUID.test(options.listingId)) return { ok: false }
  const scope = `${field}=eq.${encodeURIComponent(user.id)}${options.listingId ? `&listing_id=eq.${options.listingId}` : ''}&order=created_at.desc&limit=100`
  let response = await request(`enquiries?select=${LEAD_COLUMNS},listing_id&${scope}`, {}, user)
  // ROLLOUT BRIDGE (Phase 19). Until the Phase 19 migration is applied live,
  // `listing_id` does not exist and PostgREST answers 400. The unfiltered
  // inbox then falls back to the Phase 9 columns so it keeps working; a
  // listing filter cannot be honoured without the column and reports
  // unavailable. Remove once the migration is confirmed live
  // (docs/phases/PHASE-19-seller-dashboard.md §9).
  if (response?.status === 400 && !options.listingId) response = await request(`enquiries?select=${LEAD_COLUMNS}&${scope}`, {}, user)
  if (!response?.ok) return { ok: false }
  try {
    const rows: unknown = await response.json()
    if (!Array.isArray(rows)) return { ok: false }
    const leads: unknown[] = rows.map((row: unknown) => (row && typeof row === 'object' ? { listing_id: null, ...row } : row))
    return leads.every(validLead) ? { ok: true, rows: leads } : { ok: false }
  } catch { return { ok: false } }
}

export type ListingEnquiryCount = { listing_id: string; total: number; new_count: number; latest_at: string }

/** Per-listing totals for the signed-in seller; null when they could not be read (never zero by default). */
export async function listingEnquiryCounts(user: AuthUser): Promise<ListingEnquiryCount[] | null> {
  const response = await request('rpc/seller_listing_enquiry_counts', { method: 'POST', body: {} }, user)
  if (!response?.ok) return null
  try {
    const rows: unknown = await response.json()
    return Array.isArray(rows) && rows.every((r) => typeof r?.listing_id === 'string' && Number.isSafeInteger(r.total) && Number.isSafeInteger(r.new_count)) ? rows as ListingEnquiryCount[] : null
  } catch { return null }
}

/**
 * An enquiry about a real (Phase 18) listing.
 *
 * The client names only the listing and the buyer's own details. Whether
 * the listing is public, who the seller is and what it is called are all
 * decided by `submit_listing_enquiry` inside the database transaction, so
 * nothing here can route a lead to the wrong person or reach a listing that
 * is not live.
 */
export async function recordListingLead(input: { listingId: string; name: string; phone: string; message?: string }, user: AuthUser | null): Promise<
  { ok: true; duplicate: boolean; sellerNotified: boolean } |
  { ok: false; errors: Partial<Record<EnquiryFieldError, string>> }
> {
  const { errors, name, phone, message } = validateEnquiry({ ...input, listingPublicId: input.listingId })
  if (!UUID.test(input.listingId)) errors.listing = 'This property could not be identified.'
  if (Object.keys(errors).length) return { ok: false, errors }
  const response = await request('rpc/submit_listing_enquiry', {
    method: 'POST', body: { p_listing: input.listingId, p_name: name, p_phone: phone, p_message: message ?? null },
  }, user)
  if (!response?.ok) return { ok: false, errors: { listing: listingFailure(response?.status) } }
  try {
    const rows: unknown = await response.json()
    if (!Array.isArray(rows) || rows.length !== 1 || typeof rows[0]?.repeated !== 'boolean' || typeof rows[0]?.seller_notified !== 'boolean') throw new Error('Invalid response')
    return { ok: true, duplicate: rows[0].repeated, sellerNotified: rows[0].seller_notified }
  } catch { return { ok: false, errors: { listing: 'Your enquiry could not be confirmed. Please try again.' } } }
}

/** The database's PTxxx codes, in words; see the Phase 19 migration. */
function listingFailure(status: number | undefined): string {
  switch (status) {
    case 410: return 'This listing is no longer available, so it cannot receive enquiries.'
    case 429: return 'Too many recent enquiries for this number. Please try again later.'
    case 403: return 'This is your own listing. Enquiries from buyers appear in your seller inbox.'
    case 400: return 'Please check your details and try again.'
    // The function does not exist yet: the migration has not been applied.
    case 404: return 'Enquiries for this listing are not available yet. Please try again later.'
    default: return 'Your enquiry could not be saved. Please try again.'
  }
}

export async function listLeadEvents(user: AuthUser, ids: string[]): Promise<LeadEvent[] | null> {
  if (!ids.length) return []
  const response = await request(`lead_events?select=enquiry_id,event_type,status,created_at&enquiry_id=in.(${ids.map(encodeURIComponent).join(',')})&order=created_at.asc`, {}, user)
  if (!response?.ok) return null
  try {
    const rows: unknown = await response.json()
    return Array.isArray(rows) && rows.every((r) => typeof r.enquiry_id === 'string' && typeof r.event_type === 'string' && typeof r.created_at === 'string') ? rows as LeadEvent[] : null
  } catch { return null }
}

export async function countUnreadNotifications(user: AuthUser): Promise<number | null> {
  const response = await request(`seller_notifications?select=id&seller_id=eq.${encodeURIComponent(user.id)}&read_at=is.null&limit=100`, {}, user)
  if (!response?.ok) return null
  try { const rows: unknown = await response.json(); return Array.isArray(rows) ? rows.length : null } catch { return null }
}

export async function markNotificationsRead(user: AuthUser): Promise<boolean> {
  const response = await request(`seller_notifications?seller_id=eq.${encodeURIComponent(user.id)}&read_at=is.null`, {
    method: 'PATCH', body: { read_at: new Date().toISOString() },
  }, user)
  return response?.ok === true
}

export async function changeLeadStatus(user: AuthUser, id: string, status: Lead['status']): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['new', 'contacted', 'closed'].includes(status)) return false
  const response = await request('rpc/update_lead_status', { method: 'POST', body: { p_enquiry_id: id, p_status: status } }, user)
  if (!response?.ok) return false
  try { return await response.json() === true } catch { return false }
}
