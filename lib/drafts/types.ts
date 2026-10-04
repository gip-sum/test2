import { DETAIL_KEYS } from '@/lib/posting/details'
import { LOCATION_KEYS } from '@/lib/posting/location'
import { PRICING_KEYS } from '@/lib/posting/pricing'

export const DRAFT_KEYS = ['role', 'intent', 'type', ...DETAIL_KEYS, ...LOCATION_KEYS, ...PRICING_KEYS, 'edit', 'step'] as const
export type DraftKey = typeof DRAFT_KEYS[number]
export type Snapshot = { path: '/post' | '/post/photos'; input: Partial<Record<DraftKey, string>> }
export type Draft = { id: string; owner_id: string; collection_id: string; revision: number; created_at: string; updated_at: string; page_path: Snapshot['path'] } & Partial<Record<DraftKey, string | null>>
export function parseSnapshot(value: unknown): Snapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  if (Object.keys(v).some(k => k !== 'path' && k !== 'input') || (v.path !== '/post' && v.path !== '/post/photos') || !v.input || typeof v.input !== 'object' || Array.isArray(v.input)) return null
  const input: Snapshot['input'] = {}
  for (const [key, val] of Object.entries(v.input)) {
    if (!(DRAFT_KEYS as readonly string[]).includes(key) || typeof val !== 'string' || val.length > 240 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(val)) return null
    input[key as DraftKey] = val
  }
  return { path: v.path, input }
}
export function snapshotOf(draft: Draft): Snapshot {
  return { path: draft.page_path, input: Object.fromEntries(DRAFT_KEYS.flatMap(k => draft[k] == null ? [] : [[k, draft[k]]])) }
}
export function snapshotUrl(snapshot: Snapshot) {
  const query = new URLSearchParams(snapshot.input as Record<string, string>).toString()
  return snapshot.path + (query ? `?${query}` : '')
}
export function snapshotFromUrl(url: URL): Snapshot {
  return { path: url.pathname === '/post/photos' ? '/post/photos' : '/post', input: Object.fromEntries(DRAFT_KEYS.flatMap(k => url.searchParams.has(k) ? [[k, url.searchParams.get(k)!]] : [])) }
}
export function sameSnapshot(a: Snapshot, b: Snapshot) {
  return a.path === b.path && DRAFT_KEYS.every(k => (a.input[k] ?? null) === (b.input[k] ?? null))
}
export function draftTitle(draft: Draft) {
  return [draft.bhk && `${draft.bhk} BHK`, draft.type?.replaceAll('_', ' ').toLowerCase(), draft.locality?.replaceAll('-', ' ')].filter(Boolean).join(' · ') || 'New property draft'
}
