import { DEMO_PROPERTIES, DEMO_SUMMARIES } from './demo-data'
import type { Intent, PropertyDetail, PropertySummary } from './types'

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
export function getRecentListings(options?: { intent?: Intent; limit?: number; withPhotos?: boolean; distinctPhotos?: boolean }): PropertySummary[] {
  const { intent, limit = 6, withPhotos = false, distinctPhotos = false } = options ?? {}
  const seenPhotos = new Set<string>()
  return DEMO_SUMMARIES.filter((p) => (!intent || p.intent === intent) && (!withPhotos || p.photos.length > 0))
    .slice()
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
    .filter((property) => {
      if (!distinctPhotos) return true
      const cover = property.photos[0]?.url
      if (!cover || seenPhotos.has(cover)) return false
      seenPhotos.add(cover)
      return true
    })
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
  for (const p of DEMO_SUMMARIES) {
    if (intent && p.intent !== intent) continue
    counts.set(p.localitySlug, (counts.get(p.localitySlug) ?? 0) + 1)
  }
  return counts
}

/** Total active listings for an intent. Used for honest, inventory-backed copy. */
export function getListingCount(intent?: Intent): number {
  return DEMO_SUMMARIES.filter((p) => !intent || p.intent === intent).length
}

/**
 * One listing, with everything the property page needs.
 *
 * The only function that returns a PropertyDetail. Everything else in this
 * module returns summaries, so the heavy fields are loaded exactly once —
 * on the page that renders them.
 */
export function getPropertyDetail(publicId: string): PropertyDetail | undefined {
  return DEMO_PROPERTIES.find((p) => p.publicId === publicId)
}

/** Resolve a saved listing without exposing the current inventory source to account pages. */
export function getPropertySummary(publicId: string): PropertySummary | undefined {
  return DEMO_SUMMARIES.find((p) => p.publicId === publicId)
}
