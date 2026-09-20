import { DEMO_PROPERTIES } from './demo-data'
import type { Intent, PropertySummary } from './types'

/**
 * Property reads.
 *
 * The only module that knows where listing data comes from. Phase 5 swaps
 * the fixture for Prisma; these signatures do not change, so no page or
 * component is touched by that migration.
 */

/** True while listings come from the fixture. Drives the development banner. */
export const USING_DEMO_DATA = true

/** Newest listings first. `intent` narrows to buy or rent when supplied. */
export function getRecentListings(options?: { intent?: Intent; limit?: number }): PropertySummary[] {
  const { intent, limit = 6 } = options ?? {}
  return DEMO_PROPERTIES.filter((p) => !intent || p.intent === intent)
    .slice()
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
    .slice(0, limit)
}

/**
 * How many active listings each locality currently has.
 *
 * Counted from real inventory, never invented. With the fixture these are
 * single digits — which is honest, and exactly what a new marketplace looks
 * like before sellers arrive.
 */
export function getListingCountsByLocality(intent?: Intent): Map<string, number> {
  const counts = new Map<string, number>()
  for (const p of DEMO_PROPERTIES) {
    if (intent && p.intent !== intent) continue
    counts.set(p.localitySlug, (counts.get(p.localitySlug) ?? 0) + 1)
  }
  return counts
}

/** Total active listings for an intent. Used for honest, inventory-backed copy. */
export function getListingCount(intent?: Intent): number {
  return DEMO_PROPERTIES.filter((p) => !intent || p.intent === intent).length
}
