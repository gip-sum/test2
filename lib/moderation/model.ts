import { UUID } from '@/lib/media/types'
import type { Listing, PublicSubmission, PublicListingPhoto } from '@/lib/listings/types'

export const REVIEW_ACTIONS = ['APPROVE', 'REJECT', 'REQUEST_CORRECTION'] as const
export type ReviewAction = typeof REVIEW_ACTIONS[number]
export const ACTION_LABEL: Record<ReviewAction, string> = { APPROVE: 'Approved', REJECT: 'Rejected', REQUEST_CORRECTION: 'Corrections requested' }
export type DecisionInput = { listing: string; submission: string; version: number; action: ReviewAction; reason: string | null; days: number | null; request: string; accepted: true }
export type ModerationAction = { id: string; listing_id: string; submission_id: string; actor_id: string; action: ReviewAction; reason: string | null; approval_days: number | null; expires_at: string | null; version_before: number; version_after: number; created_at: string }
export type Review = { listing: Listing; submission: PublicSubmission; photos: PublicListingPhoto[]; history: ModerationAction[] }
export const MAX_DECISION_BYTES = 12000

export function decisionInput(value: unknown): DecisionInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const b = value as Record<string, unknown>
  if (Object.keys(b).some(k => !['listing', 'submission', 'version', 'action', 'reason', 'days', 'request', 'accepted'].includes(k))) return null
  if (![b.listing, b.submission, b.request].every(v => typeof v === 'string' && UUID.test(v))) return null
  if (!Number.isSafeInteger(b.version) || (b.version as number) < 0 || (b.version as number) >= 2147483647 || b.accepted !== true) return null
  if (!(REVIEW_ACTIONS as readonly unknown[]).includes(b.action)) return null
  if (b.reason !== null && typeof b.reason !== 'string') return null
  const reason = typeof b.reason === 'string' ? b.reason.trim() : null
  if (reason && (/[^\P{Cc}\n\t]/u.test(reason) || /\p{Cs}/u.test(reason))) return null
  const length = Array.from(reason ?? '').length
  if (length > 2000 || (length > 0 && length < 5) || (b.action !== 'APPROVE' && length < 5)) return null
  if (b.action === 'APPROVE' ? !Number.isInteger(b.days) || (b.days as number) < 1 || (b.days as number) > 180 : b.days !== null) return null
  return { listing: b.listing as string, submission: b.submission as string, version: b.version as number, action: b.action as ReviewAction, reason: reason || null, days: b.days as number | null, request: b.request as string, accepted: true }
}

export function canDecide(review: Review, reviewer: string): boolean {
  return review.listing.status === 'UNDER_REVIEW' && review.listing.owner_id !== reviewer
}
