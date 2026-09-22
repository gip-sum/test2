import { DEMO_SUMMARIES } from './demo-data'
import { getSiblingLocalitySlugs } from '@/lib/location/queries'
import type { PropertySummary } from './types'

/**
 * Similar properties, by the rule in screen-spec §5.
 *
 *   1. same locality → same property type → same BHK → price within ±20%
 *   2. if fewer than 4 → widen to ADJACENT localities
 *   3. if still fewer than 4 → widen price to ±35%
 *   4. fewer than 4 after all of that → show nothing
 *
 * Deterministic and explainable, as §5 requires. "Similar" that cannot be
 * explained is just noise with a heading on it, and a seller asking why
 * their listing appears under someone else's deserves an answer.
 *
 * TWO DEPARTURES FROM §5, both approved, both because the data does not
 * exist yet rather than because the rule is wrong:
 *
 * ADJACENCY. §5 widens to adjacent localities. There is no adjacency
 * relation in the gazetteer — thirty-two of the localities hang directly
 * off `kolkata`, so "same parent" would mean "anywhere in Kolkata" and
 * would make the word adjacent meaningless. So tier 2 applies only where a
 * genuine sibling set exists, which today means sub-localities; a
 * city-level locality skips straight to tier 3. Phase 33 owns real
 * adjacency and will replace `getSiblingLocalitySlugs` without touching
 * the tiers.
 *
 * ORDERING. §5 orders by proximity then recency. There are no coordinates
 * anywhere in the project, so proximity is not computable. Ordering is by
 * recency alone. Proxying proximity with price similarity was considered
 * and rejected: it is not proximity, and presenting it as such would be a
 * claim the platform cannot stand behind. Phase 35 adds the real thing.
 */

export const SIMILAR_MINIMUM = 4
export const SIMILAR_LIMIT = 6

const TIER_1_BAND = 0.2
const TIER_3_BAND = 0.35

type Candidate = PropertySummary

function withinBand(price: number, target: number, band: number): boolean {
  return price >= target * (1 - band) && price <= target * (1 + band)
}

function byRecency(a: Candidate, b: Candidate): number {
  // id breaks ties so the order is stable across renders — an unstable
  // sort in a horizontal scroller reshuffles under the user's thumb.
  return b.postedAt.localeCompare(a.postedAt) || a.id.localeCompare(b.id)
}

function match(
  pool: Candidate[],
  subject: PropertySummary,
  localities: string[],
  band: number,
): Candidate[] {
  const places = new Set(localities)
  return pool
    .filter(
      (p) =>
        p.id !== subject.id &&
        p.intent === subject.intent &&
        places.has(p.localitySlug) &&
        p.propertyType === subject.propertyType &&
        p.bedrooms === subject.bedrooms &&
        withinBand(p.price, subject.price, band),
    )
    .sort(byRecency)
}

/** Which tier produced the result, so the UI and tests can be explicit. */
export type SimilarOutcome = {
  results: Candidate[]
  tier: 1 | 2 | 3 | null
}

export function getSimilarProperties(
  subject: PropertySummary,
  options?: { corpus?: PropertySummary[] },
): SimilarOutcome {
  const pool = options?.corpus ?? DEMO_SUMMARIES
  const own = [subject.localitySlug]

  const tier1 = match(pool, subject, own, TIER_1_BAND)
  if (tier1.length >= SIMILAR_MINIMUM) return { results: tier1.slice(0, SIMILAR_LIMIT), tier: 1 }

  // Tier 2 — only where adjacency is real. See the note above.
  const siblings = getSiblingLocalitySlugs(subject.localitySlug)
  if (siblings.length > 0) {
    const tier2 = match(pool, subject, [...own, ...siblings], TIER_1_BAND)
    if (tier2.length >= SIMILAR_MINIMUM) return { results: tier2.slice(0, SIMILAR_LIMIT), tier: 2 }
  }

  const widerPlaces = siblings.length > 0 ? [...own, ...siblings] : own
  const tier3 = match(pool, subject, widerPlaces, TIER_3_BAND)
  if (tier3.length >= SIMILAR_MINIMUM) return { results: tier3.slice(0, SIMILAR_LIMIT), tier: 3 }

  // Never padded. Four genuinely comparable properties is the bar; below it
  // the section is worth less than the space it takes.
  return { results: [], tier: null }
}
