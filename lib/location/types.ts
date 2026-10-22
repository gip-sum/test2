/** Levels of the canonical place tree. V0 seeds CITY → LOCALITY → SUB_LOCALITY. */
export type LocationType = 'CITY' | 'ZONE' | 'LOCALITY' | 'SUB_LOCALITY' | 'SOCIETY'

export type Location = {
  id: string
  /** URL slug. Stable — SEO routes are built from it. */
  slug: string
  name: string
  type: LocationType
  /** Parent slug, or null for a city. */
  parentSlug: string | null
  /** Human path for display: "Action Area I, New Town". */
  displayPath: string
  /** Alternate spellings people actually type (Bidhannagar / Salt Lake). */
  aliases?: string[]
}

/**
 * A published point standing for a whole LOCALITY, with where it came from
 * (UI-21, lib/location/centres.ts). Read through getMapLocality, never off
 * the place tree: the typeahead ships the tree to the browser, and the map
 * is the only reader of these.
 */
export type LocalityCentre = {
  lat: number
  lng: number
  source: 'india-post' | 'geonames'
  /** The record it was read from: a PIN and office name, or a GeoNames place. */
  reference: string
}
