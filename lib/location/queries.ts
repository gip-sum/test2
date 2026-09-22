import { KOLKATA_LOCATIONS, POPULAR_LOCALITY_SLUGS } from './kolkata'
import type { Location } from './types'

/**
 * Location reads.
 *
 * The only module that knows where place data comes from. Phase 5 replaces
 * the fixture with Prisma queries; every signature here stays the same.
 */

/**
 * Places a property can be filtered BY.
 *
 * Societies are in the gazetteer so a listing can point at a real row
 * instead of repeating a display string, but no property carries a society
 * as its `localitySlug`. Letting one through here would accept
 * `/buy/kolkata/new-town-upohar-luxury-residences` as a locality route and
 * render a confident heading over zero results. Society-level search is
 * Phase 32's, and it needs its own field to filter on.
 */
const SEARCHABLE = (l: Location) => l.type === 'LOCALITY' || l.type === 'SUB_LOCALITY'

export function getLocationBySlug(slug: string): Location | undefined {
  return KOLKATA_LOCATIONS.find((l) => l.slug === slug)
}

/** Lookup by the `loc_`-prefixed id, for `societyLocationId` on a listing. */
export function getLocationById(id: string): Location | undefined {
  return KOLKATA_LOCATIONS.find((l) => l.id === id)
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

  // Societies are excluded: they are not filterable, so suggesting one
  // would hand the user a search that cannot return anything.
  const scored = KOLKATA_LOCATIONS.filter(SEARCHABLE)
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
  return KOLKATA_LOCATIONS.filter(SEARCHABLE).map((l) => l.slug)
}

/**
 * slug → display name, for anything that renders a locality it only has a
 * slug for: facet rows, active-filter chips, zero-result suggestions.
 */
export function getLocalityNameMap(): Map<string, string> {
  return new Map(KOLKATA_LOCATIONS.map((l) => [l.slug, l.name]))
}

/**
 * Places genuinely adjacent to this one, as far as the gazetteer knows.
 *
 * Today that means: for a SUB_LOCALITY, its parent and the parent's other
 * sub-localities. For a city-level LOCALITY it means NOTHING — all
 * thirty-two hang directly off `kolkata`, so treating them as siblings
 * would return the whole city under the word "adjacent".
 *
 * Returning an empty array is the honest answer, and callers are written to
 * skip their adjacency step rather than widen wrongly. Phase 33 replaces
 * the body of this function with real adjacency; no caller changes.
 */
export function getSiblingLocalitySlugs(slug: string): string[] {
  const here = getLocationBySlug(slug)
  if (!here || here.type !== 'SUB_LOCALITY' || !here.parentSlug) return []
  const parent = here.parentSlug
  return KOLKATA_LOCATIONS.filter(
    (l) => l.slug !== slug && (l.slug === parent || (l.type === 'SUB_LOCALITY' && l.parentSlug === parent)),
  ).map((l) => l.slug)
}
