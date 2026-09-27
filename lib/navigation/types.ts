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

/**
 * One destination in the discovery hub (Phase C).
 *
 * Either a place of its own (`href`: "Home loan EMI calculator"), or a
 * name with a link per intent (`pills`: "Flats — Buy · Rent"), where the
 * name alone could mean either. A pill exists only for an intent with
 * listings behind it, and an entry left with no pills is not offered.
 */
export type HubEntry = {
  /** Stable, unique in the hub: the React key and the icon's name. */
  id: string
  label: string
  href?: string
  /** The row's second line. */
  hint?: string
  /** "Buy" and "Rent", each with its context ("flats", "in Salt Lake"). */
  pills?: NavLink[]
}

/**
 * Everything GharBazaar offers, grouped the way people look for it
 * (Phase C): the phone menu and the desktop "Explore all" panel both
 * render this, so they cannot disagree.
 *
 * Only destinations that exist. There is no field for a destination the
 * product has not built — commercial, plots, projects, builders, agents,
 * comparison, price trends, guides, FAQs, a seller's own listings — and a
 * group with nothing real in it has no field either (resources). Each
 * waits in docs/ROADMAP.md for the phase that builds it.
 */
export type DiscoveryHub = {
  /** Buy and Rent. */
  explore: HubEntry[]
  /** The supported property types, each with the intents that have them. */
  types: HubEntry[]
  /** The localities index and the listing collections worth a name. */
  discover: HubEntry[]
  /** Popular localities, each with Buy and Rent where there are listings. */
  localities: HubEntry[]
  tools: HubEntry[]
  account: HubEntry[]
  /** Posting, and what an advertiser already has. */
  sell: { post: HubEntry; more: HubEntry[] }
}

export type MarketplaceNav = {
  city: string
  sections: NavSection[]
  /** Popular localities, each with its for-sale and to-rent results. */
  localities: LocalityNav[]
  hub: DiscoveryHub
}
