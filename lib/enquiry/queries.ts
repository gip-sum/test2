import 'server-only'
import { cookies } from 'next/headers'
import { authConfig, type AuthUser } from '@/lib/auth/provider'
import { ACCESS_COOKIE } from '@/lib/auth/session'
import { getPropertyDetail } from '@/lib/property/queries'
import { validateEnquiry } from './validate'
import type { EnquiryInput, EnquiryFieldError } from './types'

export type Lead = {
  id: string
  listing_public_id: string
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
  return typeof lead.id === 'string' && typeof lead.listing_public_id === 'string' &&
    typeof lead.listing_title === 'string' && typeof lead.buyer_name === 'string' &&
    typeof lead.buyer_phone === 'string' && ['new', 'contacted', 'closed'].includes(lead.status ?? '') &&
    typeof lead.created_at === 'string'
}

export async function listLeads(user: AuthUser, view: 'buyer' | 'seller'): Promise<LeadList> {
  const field = view === 'buyer' ? 'buyer_id' : 'seller_id'
  const response = await request(`enquiries?select=id,listing_public_id,listing_title,buyer_name,buyer_phone,message,duplicate_of,status,created_at&${field}=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=100`, {}, user)
  if (!response?.ok) return { ok: false }
  try { const rows: unknown = await response.json(); return Array.isArray(rows) && rows.every(validLead) ? { ok: true, rows } : { ok: false } }
  catch { return { ok: false } }
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
