import { KOLKATA_LOCATIONS, POPULAR_LOCALITY_SLUGS } from './kolkata'
import type { Location } from './types'

/**
 * Location reads.
 *
 * The only module that knows where place data comes from. Phase 5 replaces
 * the fixture with Prisma queries; every signature here stays the same.
 */

export function getLocationBySlug(slug: string): Location | undefined {
  return KOLKATA_LOCATIONS.find((l) => l.slug === slug)
}

export function getLocationsBySlugs(slugs: string[]): Location[] {
  return slugs.map(getLocationBySlug).filter((l): l is Location => Boolean(l))
}

export function getPopularLocalities(): Location[] {
  return POPULAR_LOCALITY_SLUGS.map(getLocationBySlug).filter((l): l is Location => Boolean(l))
}

/**
 * Typeahead.
 *
 * Matches three ways, because all three are how people actually type:
 *   • the name           — "Ballygunge"
 *   • alternate spellings — "Bidhannagar" for Salt Lake
 *   • the parent path    — "New Town" must also surface Action Area I/II/III,
 *                          whose own names contain no "New Town" at all
 *
 * Ranking keeps exact-ish matches above contextual ones, so typing
 * "new town" still puts New Town itself first and its sub-localities under it.
 */
export function searchLocations(query: string, limit = 8): Location[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  const scored = KOLKATA_LOCATIONS.filter((l) => l.type !== 'CITY')
    .map((l) => {
      const name = l.name.toLowerCase()
      const aliases = l.aliases?.map((a) => a.toLowerCase()) ?? []
      const path = l.displayPath.toLowerCase()

      if (name.startsWith(q)) return { l, score: 0 }
      if (aliases.some((a) => a.startsWith(q))) return { l, score: 1 }
      if (name.includes(q)) return { l, score: 2 }
      if (aliases.some((a) => a.includes(q))) return { l, score: 3 }
      // Parent context last: "new t" reaches Action Area III through its path.
      if (path.includes(q)) return { l, score: 4 }
      return null
    })
    .filter((x): x is { l: Location; score: number } => x !== null)
    .sort((a, b) => a.score - b.score || a.l.name.localeCompare(b.l.name))

  return scored.slice(0, limit).map((x) => x.l)
}

/**
 * Every slug the route grammar will accept as a locality segment.
 *
 * Read once at module scope by the search route: deciding whether
 * /buy/kolkata/new-town means a place or a filter has to be cheap, because
 * it happens before anything else on every result page.
 */
export function getAllLocalitySlugs(): string[] {
  return KOLKATA_LOCATIONS.filter((l) => l.type !== 'CITY').map((l) => l.slug)
}

/**
 * slug → display name, for anything that renders a locality it only has a
 * slug for: facet rows, active-filter chips, zero-result suggestions.
 */
export function getLocalityNameMap(): Map<string, string> {
  return new Map(KOLKATA_LOCATIONS.map((l) => [l.slug, l.name]))
}
