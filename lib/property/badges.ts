import { isNewListing } from '@/lib/format/date'
import type { PropertySummary } from './types'

export type ListingBadge = { tone: 'brand' | 'supply' | 'neutral'; label: string }

/**
 * The badges a listing card may show, in priority order, at most two
 * (UI-06: one rule for every card, where each card used to repeat it).
 *
 * Only facts the platform holds: posted recently, price lowered, and — for
 * the browsing card, whose short attribute line leaves it out — under
 * construction. Overflow is dropped, never stacked. There is no "Verified"
 * badge because the platform verifies nothing.
 */
export function listingBadges(
  property: Pick<PropertySummary, 'postedAt' | 'isPriceReduced' | 'constructionStatus'>,
  { construction = false }: { construction?: boolean } = {},
): ListingBadge[] {
  const badges: ListingBadge[] = []
  if (isNewListing(property.postedAt)) badges.push({ tone: 'brand', label: 'New' })
  if (property.isPriceReduced) badges.push({ tone: 'supply', label: 'Price reduced' })
  if (construction && property.constructionStatus === 'UNDER_CONSTRUCTION') badges.push({ tone: 'neutral', label: 'Under construction' })
  return badges.slice(0, 2)
}
