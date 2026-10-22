import type { LocalityMatch } from '@/lib/property/search'
import type { MapLocality } from '@/lib/location/queries'

/**
 * The matches grouped the way the map draws them (UI-21): one area per
 * LOCALITY, holding its sub-localities and societies, at the locality's
 * cited point. Pure, so the grouping is tested without the gazetteer or the
 * corpus; the page passes `placeOf` (lib/location/queries, getMapLocality).
 */
export type MapArea = {
  /** The locality's slug. */
  slug: string
  name: string
  /** Matches across every page, not this page. */
  count: number
  minPrice: number
  maxPrice: number
  /** The listing locality slugs this area holds, for "Show these homes". */
  members: string[]
  /** Absent: no cited point, so the area is listed but not drawn. */
  centre?: { lat: number; lng: number }
}

export type MapAreas = { placed: MapArea[]; unplaced: MapArea[]; placedCount: number; unplacedCount: number }

export function groupForMap(
  matches: LocalityMatch[],
  placeOf: (slug: string) => MapLocality | undefined,
  names: Map<string, string>,
): MapAreas {
  const areas = new Map<string, MapArea>()
  for (const m of matches) {
    // A slug the gazetteer cannot place (a real listing's locality it does
    // not hold yet) is its own unplaced area, under its own name — never
    // folded into a neighbour or the city.
    const place = placeOf(m.slug) ?? { slug: m.slug, name: names.get(m.slug) ?? m.slug, centre: undefined }
    const area = areas.get(place.slug)
    if (!area) {
      areas.set(place.slug, {
        slug: place.slug, name: place.name, count: m.count, minPrice: m.minPrice, maxPrice: m.maxPrice, members: [m.slug],
        ...(place.centre ? { centre: { lat: place.centre.lat, lng: place.centre.lng } } : {}),
      })
    } else {
      area.count += m.count
      area.minPrice = Math.min(area.minPrice, m.minPrice)
      area.maxPrice = Math.max(area.maxPrice, m.maxPrice)
      area.members.push(m.slug)
    }
  }
  const all = [...areas.values()]
  for (const a of all) a.members.sort()
  const order = (a: MapArea, b: MapArea) => b.count - a.count || a.name.localeCompare(b.name)
  const placed = all.filter((a) => a.centre).sort(order)
  const unplaced = all.filter((a) => !a.centre).sort(order)
  const sum = (xs: MapArea[]) => xs.reduce((n, a) => n + a.count, 0)
  return { placed, unplaced, placedCount: sum(placed), unplacedCount: sum(unplaced) }
}
