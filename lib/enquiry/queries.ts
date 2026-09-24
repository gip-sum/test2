import 'server-only'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE } from '@/lib/auth/session'
import { authConfig, type AuthUser } from '@/lib/auth/provider'
import type { EnquiryHistoryItem, LeadStatus, NotificationStatus } from './types'

type Row = {
  id: string
  buyer_id: string | null
  property_public_id: string
  listing_title: string
  listing_locality: string
  seller_type: 'OWNER' | 'AGENT' | 'BUILDER'
  seller_name: string | null
  buyer_name: string
  buyer_phone: string
  message: string | null
  source: 'property_page'
  status: LeadStatus
  notification_status: NotificationStatus
  duplicate_of: string | null
  created_at: string
}

export type NewEnquiryRow = Omit<Row, 'id' | 'status' | 'created_at' | 'duplicate_of'>
export type HistoryResult = { ok: true; rows: EnquiryHistoryItem[] } | { ok: false }

function restBase() {
  const config = authConfig()
  return config?.base.replace(/\/auth\/v1$/, '/rest/v1') ?? null
}

function secretHeaders() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) return null
  return {
    apikey: key,
    'Content-Type': 'application/json',
    ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
  }
}

async function adminRequest(path: string, init?: RequestInit): Promise<Response | null> {
  const base = restBase()
  const headers = secretHeaders()
  if (!base || !headers) return null
  try {
    return await fetch(base + path, {
      ...init,
      headers: { ...headers, ...init?.headers },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
  } catch { return null }
}

function isRow(value: unknown): value is Row {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<Row>
  return typeof row.id === 'string' && typeof row.property_public_id === 'string' &&
    typeof row.listing_title === 'string' && typeof row.listing_locality === 'string' &&
    ['OWNER', 'AGENT', 'BUILDER'].includes(row.seller_type ?? '') &&
    typeof row.buyer_name === 'string' && /^\+91[6-9]\d{9}$/.test(row.buyer_phone ?? '') &&
    ['NEW', 'CONTACTED', 'CLOSED'].includes(row.status ?? '') &&
    ['PENDING', 'DELIVERED', 'FAILED', 'UNCONFIGURED'].includes(row.notification_status ?? '') &&
    typeof row.created_at === 'string'
}

function toEnquiry(row: Row): EnquiryHistoryItem {
  return {
    id: row.id,
    listingId: row.property_public_id,
    listingPublicId: row.property_public_id,
    listingTitle: row.listing_title,
    listingLocality: row.listing_locality,
    sellerType: row.seller_type,
    ...(row.seller_name ? { sellerName: row.seller_name } : {}),
    name: row.buyer_name,
    phone: row.buyer_phone,
    ...(row.message ? { message: row.message } : {}),
    createdAt: row.created_at,
    source: row.source,
    status: row.status,
    notificationStatus: row.notification_status,
    ...(row.duplicate_of ? { duplicateOf: row.duplicate_of } : {}),
  }
}

export async function insertEnquiry(row: NewEnquiryRow): Promise<EnquiryHistoryItem | null> {
  const response = await adminRequest('/enquiries?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  })
  if (!response?.ok) return null
  try {
    const rows: unknown = await response.json()
    return Array.isArray(rows) && rows.length === 1 && isRow(rows[0]) ? toEnquiry(rows[0]) : null
  } catch { return null }
}

export async function setNotificationStatus(id: string, status: Exclude<NotificationStatus, 'PENDING'>): Promise<boolean> {
  const now = new Date().toISOString()
  const response = await adminRequest(`/enquiries?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      notification_status: status,
      notification_attempted_at: status === 'UNCONFIGURED' ? null : now,
      notified_at: status === 'DELIVERED' ? now : null,
    }),
  })
  return response?.ok === true
}

export async function listBuyerEnquiries(user: AuthUser): Promise<HistoryResult> {
  const base = restBase()
  const config = authConfig()
  const token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!base || !config || !token) return { ok: false }
  const fields = 'id,buyer_id,property_public_id,listing_title,listing_locality,seller_type,seller_name,buyer_name,buyer_phone,message,source,status,notification_status,duplicate_of,created_at'
  try {
    const response = await fetch(`${base}/enquiries?select=${fields}&buyer_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc`, {
      headers: { apikey: config.key, Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return { ok: false }
    const rows: unknown = await response.json()
    if (!Array.isArray(rows) || !rows.every(isRow)) return { ok: false }
    return { ok: true, rows: rows.map(toEnquiry) }
  } catch { return { ok: false } }
}
