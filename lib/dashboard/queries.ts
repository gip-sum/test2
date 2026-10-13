import 'server-only'
import type { AuthUser } from '@/lib/auth/provider'
import { listDrafts } from '@/lib/drafts/queries'
import { listingEnquiryCounts } from '@/lib/enquiry/queries'
import { listDraftEvents, listOwnerListings, listSubmissionSummaries } from '@/lib/listings/queries'
import { getPostingLocations } from '@/lib/location/queries'
import { kolkataToday } from '@/lib/posting/details'
import { buildCards, type PropertyCard } from './model'

/**
 * Everything the seller dashboard reads, with the seller's own session.
 *
 * Drafts, listings and the DRAFT history that tells a withdrawal from a
 * draft are essential: without them the page cannot say what a property's
 * status is, so any failure there is a page-level error rather than a
 * dashboard that looks empty. Submission summaries and enquiry counts are
 * supplementary: when they fail, the cards still render and say which part
 * is unavailable.
 */
export async function loadDashboard(user: AuthUser): Promise<{ ok: true; cards: PropertyCard[] } | { ok: false }> {
  try {
    const [drafts, listings, enquiryCounts] = await Promise.all([listDrafts(user), listOwnerListings(user), listingEnquiryCounts(user)])
    const [draftEvents, submissions] = await Promise.all([
      listDraftEvents(user, listings.filter((l) => l.status === 'DRAFT').map((l) => l.id)),
      listSubmissionSummaries(user, listings.flatMap((l) => (l.current_submission_id ? [l.current_submission_id] : []))).catch(() => null),
    ])
    const now = Date.now()
    return { ok: true, cards: buildCards({ drafts, listings, draftEvents, submissions, enquiryCounts, places: getPostingLocations(), today: kolkataToday(new Date(now)), now }) }
  } catch {
    return { ok: false }
  }
}
