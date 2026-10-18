import { DASHBOARD_LABEL, type DashboardStatus } from '@/lib/dashboard/model'
import { LISTING_STATUS, type ListingStatus, STATUS_LABEL } from '@/lib/listings/types'
import { ACCOUNT_STATUSES, type AccountStatus } from '@/lib/users/model'

/**
 * The one visual language for listing status (UI-03).
 *
 * Every status a seller or staff member can see maps to one of four tones,
 * named by what the status means for the listing rather than by colour:
 *   neutral  not in front of buyers and nothing pending (draft, expired,
 *            withdrawn, removed)
 *   pending  waiting on review or on the seller's corrections
 *   live     buyers can see it
 *   problem  rejected
 * Each tone is a pair of @theme tokens (`--color-status-<tone>` and
 * `-bg`) aliasing the semantic colours, so a palette change or the dark
 * theme follows automatically. Status components use this map and never
 * pick colours themselves; components/ui/StatusBadge.tsx (UI-05) is the one
 * badge built on it.
 *
 * Two real vocabularies reach the screen: the stored lifecycle
 * (`ListingStatus`, lib/listings/types — it has DELETED) and the seller's
 * and staff's derived view (`DashboardStatus`, lib/dashboard/model — it
 * splits deletion into WITHDRAWN and REMOVED). The badge accepts either; no
 * status is invented here.
 *
 * A third, small vocabulary is an account's marketplace status (UI-11,
 * lib/users/model): ACTIVE, which reads and means what a listing's does
 * (live: in front of buyers), and SUSPENDED (problem: blocked by staff,
 * like a rejection). The admin screens drew it with their own brand and
 * amber pills; one badge keeps a status from looking two ways.
 */
export type StatusTone = 'neutral' | 'pending' | 'live' | 'problem'
export type BadgeStatus = DashboardStatus | ListingStatus | AccountStatus

export const LISTING_STATUS_TONE: Record<BadgeStatus, StatusTone> = {
  DRAFT: 'neutral',
  UNDER_REVIEW: 'pending',
  ACTIVE: 'live',
  EXPIRED: 'neutral',
  REJECTED: 'problem',
  CHANGES_REQUESTED: 'pending',
  WITHDRAWN: 'neutral',
  REMOVED: 'neutral',
  DELETED: 'neutral',
  SUSPENDED: 'problem',
}

/** What each status reads as. The two vocabularies agree wherever they overlap (tested). */
export const STATUS_BADGE_LABEL: Record<BadgeStatus, string> = { ...STATUS_LABEL, ...DASHBOARD_LABEL, SUSPENDED: 'Suspended' }

const KNOWN = new Set<string>([...LISTING_STATUS, ...Object.keys(DASHBOARD_LABEL), ...ACCOUNT_STATUSES])
/** For a status that arrives as a plain string (an RPC row): draw a badge only for one we know. */
export const isBadgeStatus = (status: string): status is BadgeStatus => KNOWN.has(status)

/** Background and text utilities for a tone; full class names so Tailwind sees them. */
export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-status-neutral-bg text-status-neutral',
  pending: 'bg-status-pending-bg text-status-pending',
  live: 'bg-status-live-bg text-status-live',
  problem: 'bg-status-problem-bg text-status-problem',
}

export const statusToneClass = (status: BadgeStatus) => STATUS_TONE_CLASS[LISTING_STATUS_TONE[status]]
