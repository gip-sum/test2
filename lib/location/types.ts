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
  /** Collected for future map search; unused in V0. */
  lat?: number
  lng?: number
}
