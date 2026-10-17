import type { DashboardStatus } from '@/lib/dashboard/model'

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
 * pick colours themselves; UI-05 builds the single status badge on it.
 */
export type StatusTone = 'neutral' | 'pending' | 'live' | 'problem'

export const LISTING_STATUS_TONE: Record<DashboardStatus, StatusTone> = {
  DRAFT: 'neutral',
  UNDER_REVIEW: 'pending',
  ACTIVE: 'live',
  EXPIRED: 'neutral',
  REJECTED: 'problem',
  CHANGES_REQUESTED: 'pending',
  WITHDRAWN: 'neutral',
  REMOVED: 'neutral',
}

/** Background and text utilities for a tone; full class names so Tailwind sees them. */
export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-status-neutral-bg text-status-neutral',
  pending: 'bg-status-pending-bg text-status-pending',
  live: 'bg-status-live-bg text-status-live',
  problem: 'bg-status-problem-bg text-status-problem',
}

export const statusToneClass = (status: DashboardStatus) => STATUS_TONE_CLASS[LISTING_STATUS_TONE[status]]
