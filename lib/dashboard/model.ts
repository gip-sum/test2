import { draftTitle, type Draft } from '@/lib/drafts/types'
import { effectiveStatus, type Listing, type ListingEvent, type SubmissionSummary } from '@/lib/listings/types'
import { buildPreview } from '@/lib/preview/model'
import type { Location } from '@/lib/location/types'

/**
 * The seller dashboard, as a pure function of what the database returned.
 *
 * ONE CARD PER PROPERTY. A Phase 18 listing is bound to exactly one working
 * draft (`property_listings.draft_id` is unique), so the pair is a single
 * property and gets a single card and a single count. Rendering drafts and
 * listings as two lists would show a submitted property twice and inflate
 * every total.
 *
 * WITHDRAWN IS DERIVED, NOT STORED. Phase 18 withdrawal returns a listing to
 * DRAFT. A listing row only reaches DRAFT again by leaving another status,
 * and history records that move, so "Withdrawn" is a DRAFT listing whose
 * latest DRAFT event came from somewhere. A never-submitted draft has no
 * listing row at all.
 */

export const DASHBOARD_STATUSES = ['DRAFT', 'UNDER_REVIEW', 'ACTIVE', 'EXPIRED', 'REJECTED', 'WITHDRAWN', 'REMOVED'] as const
export type DashboardStatus = typeof DASHBOARD_STATUSES[number]
export const DASHBOARD_LABEL: Record<DashboardStatus, string> = {
  DRAFT: 'Draft', UNDER_REVIEW: 'Under review', ACTIVE: 'Active', EXPIRED: 'Expired',
  REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn', REMOVED: 'Removed',
}

/** URL filter keys, in display order. Removed is not a filter: it has its own collapsed group. */
export const FILTERS = [
  { key: 'all', label: 'All', status: null },
  { key: 'draft', label: 'Drafts', status: 'DRAFT' },
  { key: 'review', label: 'Under review', status: 'UNDER_REVIEW' },
  { key: 'active', label: 'Active', status: 'ACTIVE' },
  { key: 'expired', label: 'Expired', status: 'EXPIRED' },
  { key: 'rejected', label: 'Rejected', status: 'REJECTED' },
  { key: 'withdrawn', label: 'Withdrawn', status: 'WITHDRAWN' },
] as const satisfies ReadonlyArray<{ key: string; label: string; status: DashboardStatus | null }>
export type FilterKey = typeof FILTERS[number]['key']
export const SORTS = [{ key: 'recent', label: 'Recently updated' }, { key: 'expiring', label: 'Expiring soonest' }] as const
export type SortKey = typeof SORTS[number]['key']
export const PAGE_SIZE = 20
export const EXPIRY_WARNING_DAYS = 7
const DAY = 86_400_000

export type { SubmissionSummary }
export type EnquiryCount = { listing_id: string; total: number; new_count: number; latest_at: string }
export type DashboardQuery = { status: FilterKey; sort: SortKey; page: number }

export type PropertyCard = {
  draftId: string
  listing: Pick<Listing, 'id' | 'version' | 'current_submission_id'> | null
  status: DashboardStatus
  title: string
  intent: 'buy' | 'rent' | null
  /** Integer rupees, or null when not yet known. Never shown as ₹0. */
  price: number | null
  place: string | null
  /** The date that matters for this status (saved, submitted, live, expired…). */
  since: string
  expiresAt: string | null
  /** Whole days left on an active listing, rounded up; null otherwise. */
  daysLeft: number | null
  expiringSoon: boolean
  rejectionReason: string | null
  /** Information sections complete, for never-submitted drafts only. */
  progress: { complete: number; total: number } | null
  /** Submitted details could not be read, so the card falls back to the working draft's title. */
  detailsUnavailable: boolean
  /** null when there is no listing to have enquiries; 'unavailable' when counts could not be read. */
  enquiries: { total: number; newCount: number } | 'unavailable' | null
  activity: number
}

export type DashboardInput = {
  drafts: Draft[]
  listings: Listing[]
  /** Latest-first DRAFT events for listings currently in DRAFT. */
  draftEvents: Pick<ListingEvent, 'listing_id' | 'from_status' | 'to_status' | 'created_at'>[]
  /** null when the submission summaries could not be read. */
  submissions: SubmissionSummary[] | null
  /** null when the enquiry counts could not be read. */
  enquiryCounts: EnquiryCount[] | null
  places: readonly Location[]
  today: string
  now: number
}

export function parseQuery(params: Record<string, string | string[] | undefined>): DashboardQuery {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const status = FILTERS.find((f) => f.key === one(params.status))?.key ?? 'all'
  const sort = SORTS.find((s) => s.key === one(params.sort))?.key ?? 'recent'
  const raw = one(params.page)
  const page = raw && /^[1-9]\d{0,3}$/.test(raw) ? Number(raw) : 1
  return { status, sort, page }
}

/** Builds a dashboard URL; defaults are omitted so the canonical address stays short. */
export function dashboardHref(query: Partial<DashboardQuery>) {
  const params = new URLSearchParams()
  if (query.status && query.status !== 'all') params.set('status', query.status)
  if (query.sort && query.sort !== 'recent') params.set('sort', query.sort)
  if (query.page && query.page > 1) params.set('page', String(query.page))
  const search = params.toString()
  return '/dashboard' + (search ? `?${search}` : '')
}

export function displayStatus(listing: Pick<Listing, 'status' | 'expires_at'> | null, lastDraftEvent: Pick<ListingEvent, 'from_status'> | undefined, now: number): DashboardStatus {
  if (!listing) return 'DRAFT'
  const status = effectiveStatus(listing, now)
  if (status === 'DELETED') return 'REMOVED'
  if (status === 'DRAFT') return lastDraftEvent?.from_status ? 'WITHDRAWN' : 'DRAFT'
  return status
}

function draftSummary(draft: Draft, places: readonly Location[], today: string) {
  // The preview model already knows how to read a partial draft; photos and
  // the seller name are deliberately not loaded here (one media query per
  // draft would make the dashboard N+1). Photos are checked in the preview.
  const model = buildPreview(draft, [], null, places, today)
  const sections = [Boolean(model.entry.role && model.entry.intent && model.entry.type), Boolean(model.facts), Boolean(model.location), Boolean(model.pricing)]
  const price = model.pricing ? (model.pricing.intent === 'buy' ? model.pricing.price : model.pricing.monthlyRent) : null
  return {
    title: model.entry.type ? model.title : draftTitle(draft),
    intent: model.entry.intent ?? null,
    price,
    place: model.locality && model.city ? `${model.locality}, ${model.city}` : null,
    progress: { complete: sections.filter(Boolean).length, total: sections.length },
  }
}

export function buildCards(input: DashboardInput): PropertyCard[] {
  const { now } = input
  const drafts = new Map(input.drafts.map((d) => [d.id, d]))
  const listingByDraft = new Map(input.listings.map((l) => [l.draft_id, l]))
  const submissions = new Map((input.submissions ?? []).map((s) => [s.id, s]))
  const counts = new Map((input.enquiryCounts ?? []).map((c) => [c.listing_id, c]))
  const lastDraftEvent = new Map<string, DashboardInput['draftEvents'][number]>()
  for (const event of input.draftEvents) if (event.to_status === 'DRAFT' && !lastDraftEvent.has(event.listing_id)) lastDraftEvent.set(event.listing_id, event)

  // Every draft, plus any listing whose draft was not in the response, so a
  // listing can never silently drop off the dashboard.
  const draftIds = [...new Set([...input.drafts.map((d) => d.id), ...input.listings.map((l) => l.draft_id)])]
  return draftIds.map((draftId): PropertyCard => {
    const draft = drafts.get(draftId), listing = listingByDraft.get(draftId) ?? null
    const event = listing ? lastDraftEvent.get(listing.id) : undefined
    const status = displayStatus(listing, event, now)
    const fromDraft = draft ? draftSummary(draft, input.places, input.today) : null
    const submission = listing?.current_submission_id ? submissions.get(listing.current_submission_id) : undefined
    // A submitted property is described by what buyers see (the immutable
    // submission), never by the working draft, which may since differ.
    const submitted = Boolean(listing?.current_submission_id)
    const detailsUnavailable = submitted && !submission
    const title = submission?.title ?? fromDraft?.title ?? 'Submitted property'
    const intent = submission?.intent ?? (submitted ? null : fromDraft?.intent ?? null)
    const price = submission?.price ?? (submitted ? null : fromDraft?.price ?? null)
    const place = submission ? `${submission.locality_name}, ${submission.city_name}` : submitted ? null : fromDraft?.place ?? null
    const expiresAt = listing && (status === 'ACTIVE' || status === 'EXPIRED') ? listing.expires_at : null
    const msLeft = status === 'ACTIVE' && expiresAt ? Date.parse(expiresAt) - now : null
    const since = status === 'DRAFT' && !listing ? draft!.updated_at
      : status === 'ACTIVE' ? listing!.activated_at ?? listing!.updated_at
      : status === 'EXPIRED' ? listing!.expires_at ?? listing!.updated_at
      : status === 'WITHDRAWN' ? event?.created_at ?? listing!.updated_at
      : listing!.updated_at
    const count = listing ? counts.get(listing.id) : undefined
    const activity = Math.max(draft ? Date.parse(draft.updated_at) : 0, listing ? Date.parse(listing.updated_at) : 0)
    return {
      draftId,
      listing: listing ? { id: listing.id, version: listing.version, current_submission_id: listing.current_submission_id } : null,
      status, title, intent, price, place, since, expiresAt,
      daysLeft: msLeft === null ? null : Math.max(0, Math.ceil(msLeft / DAY)),
      expiringSoon: msLeft !== null && msLeft <= EXPIRY_WARNING_DAYS * DAY,
      rejectionReason: status === 'REJECTED' ? listing!.rejection_reason : null,
      progress: status === 'DRAFT' && !listing ? fromDraft?.progress ?? null : null,
      detailsUnavailable,
      enquiries: !listing || status === 'REMOVED' && !count ? null : input.enquiryCounts === null ? 'unavailable' : { total: count?.total ?? 0, newCount: count?.new_count ?? 0 },
      activity,
    }
  })
}

export type Dashboard = {
  counts: Record<FilterKey, number>
  expiringSoon: number
  removed: PropertyCard[]
  visible: PropertyCard[]
  page: number
  pageCount: number
  total: number
}

export function arrange(cards: PropertyCard[], query: DashboardQuery): Dashboard {
  const live = cards.filter((c) => c.status !== 'REMOVED')
  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, f.status ? live.filter((c) => c.status === f.status).length : live.length])) as Record<FilterKey, number>
  const filter = FILTERS.find((f) => f.key === query.status)!
  const recent = (a: PropertyCard, b: PropertyCard) => b.activity - a.activity || a.draftId.localeCompare(b.draftId)
  const sorted = live.filter((c) => !filter.status || c.status === filter.status).sort(query.sort === 'expiring'
    // Active listings by soonest expiry first; everything else after, most recent first.
    ? (a, b) => (a.status === 'ACTIVE' && a.expiresAt ? Date.parse(a.expiresAt) : Infinity) - (b.status === 'ACTIVE' && b.expiresAt ? Date.parse(b.expiresAt) : Infinity) || recent(a, b)
    : recent)
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const page = Math.min(query.page, pageCount)
  return {
    counts,
    expiringSoon: live.filter((c) => c.status === 'ACTIVE' && c.expiringSoon).length,
    removed: cards.filter((c) => c.status === 'REMOVED').sort(recent),
    visible: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    page, pageCount, total: sorted.length,
  }
}
