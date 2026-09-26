/**
 * The marketplace navigation's shape (Phase A).
 *
 * Kept apart from the builder in ./marketplace so client components can
 * import these types without pulling the builder — and through it the
 * property corpus and location tree — into the browser bundle.
 */

export type NavLink = {
  label: string
  href: string
  /** A short line under the label, where there is room for one. */
  hint?: string
  /** Completes the accessible name where the label leans on its panel ("Flats" → "Flats for sale"). */
  context?: string
}

export type NavGroup = { title: string; links: NavLink[] }

export type NavSectionId = 'buy' | 'rent' | 'localities' | 'loans'

export type NavSection = {
  id: NavSectionId
  /** The header word, and the menu row's title. */
  label: string
  /** Where the header word itself goes: the section's main page. */
  href: string
  /** The menu row's second line. */
  summary: string
  /** Path prefixes that mean "you are in this section". Empty for an in-page anchor. */
  match: string[]
  /** The panel's first, most prominent link. */
  lead: NavLink
  groups: NavGroup[]
}

export type LocalityNav = { name: string; buy: string; rent: string }

export type MarketplaceNav = {
  city: string
  sections: NavSection[]
  /** Popular localities, each with its for-sale and to-rent results. */
  localities: LocalityNav[]
}
