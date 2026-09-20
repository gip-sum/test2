import type { Intent, PropertyTypeCode } from '@/lib/property/types'

/**
 * The normalised search query.
 *
 * Both the indexable routes and the interactive /search surface resolve to
 * this one shape. Phase 3 adds `parseSearchParams`; Phase 2 needs only the
 * builder, because the homepage's job is to produce a correct URL.
 *
 * Route grammar (approved in Phase 0):
 *   /buy/{city}
 *   /buy/{city}/{locality}
 *   /buy/{city}/{filter-slug}
 *   /buy/{city}/{locality}/{filter-slug}
 */
export type SearchQuery = {
  intent: Intent
  city: string
  /** Locality slugs. Multi-select — people search several at once. */
  localities: string[]
  propertyTypes: PropertyTypeCode[]
  priceMin?: number
  priceMax?: number
  bedrooms: number[]
}

export const EMPTY_QUERY: SearchQuery = {
  intent: 'buy',
  city: 'kolkata',
  localities: [],
  propertyTypes: [],
  bedrooms: [],
}

/**
 * Build the canonical URL for a query.
 *
 * A single locality becomes a path segment, because that is the indexable,
 * shareable form. Several localities stay in the query string — there is no
 * sensible single page for "New Town or Salt Lake or Rajarhat", and minting
 * one per combination is exactly the thin-content trap the plan forbids.
 */
export function buildSearchUrl(q: SearchQuery): string {
  const segments = [q.intent, q.city]
  const params = new URLSearchParams()

  if (q.localities.length === 1) {
    segments.push(q.localities[0]!)
  } else if (q.localities.length > 1) {
    params.set('loc', q.localities.join(','))
  }

  if (q.propertyTypes.length) params.set('type', q.propertyTypes.join(','))
  if (q.bedrooms.length) params.set('bhk', [...q.bedrooms].sort((a, b) => a - b).join(','))
  if (q.priceMin != null) params.set('pmin', String(q.priceMin))
  if (q.priceMax != null) params.set('pmax', String(q.priceMax))

  const qs = params.toString()
  return `/${segments.join('/')}${qs ? `?${qs}` : ''}`
}

/**
 * Budget bands, in integer rupees.
 *
 * Deliberately non-linear: most Kolkata sale inventory sits below ₹1 Cr, so
 * the low end gets far more resolution than a linear scale would give it.
 */
export const BUY_BUDGET_BANDS = [
  { label: 'Up to ₹25 L', min: undefined, max: 2_500_000 },
  { label: '₹25 L – ₹50 L', min: 2_500_000, max: 5_000_000 },
  { label: '₹50 L – ₹75 L', min: 5_000_000, max: 7_500_000 },
  { label: '₹75 L – ₹1 Cr', min: 7_500_000, max: 10_000_000 },
  { label: '₹1 Cr – ₹2 Cr', min: 10_000_000, max: 20_000_000 },
  { label: 'Above ₹2 Cr', min: 20_000_000, max: undefined },
] as const

export const RENT_BUDGET_BANDS = [
  { label: 'Up to ₹10,000', min: undefined, max: 10_000 },
  { label: '₹10,000 – ₹20,000', min: 10_000, max: 20_000 },
  { label: '₹20,000 – ₹35,000', min: 20_000, max: 35_000 },
  { label: '₹35,000 – ₹50,000', min: 35_000, max: 50_000 },
  { label: 'Above ₹50,000', min: 50_000, max: undefined },
] as const
