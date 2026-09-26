import { CALCULATORS } from '@/components/calculators/catalogue'
import { LAUNCH_CITY } from '@/lib/brand'
import { getPopularLocalities } from '@/lib/location/queries'
import { searchProperties } from '@/lib/property/search'
import type { Intent } from '@/lib/property/types'
import { buildLandingUrl, emptyQuery, FILTER_SLUGS } from '@/lib/search/query'
import type { LocalityNav, MarketplaceNav, NavGroup, NavLink, NavSection } from './types'

/**
 * Every destination the marketplace shell offers (Phase A), built in one
 * place so the desktop header's panels, the phone menu and the quick
 * routes' "View all" cannot drift apart.
 *
 * Two rules, both from "nothing claims more than it knows":
 *  • Only routes that exist. Projects, agents, builders and insights have
 *    no pages yet; they wait in "Navigation destinations waiting on their
 *    phase" in docs/ROADMAP.md and join this list when they ship.
 *  • Only filters with something behind them. A type, size or budget link
 *    appears for an intent only when that search returns listings, so the
 *    navigation never leads to an empty page. The check runs through the
 *    search seam, so it stays true when fixtures become a database.
 *
 * Links are landing URLs (buildLandingUrl), the same pretty paths the
 * footer emits, never a hand-written query string.
 *
 * Server-only in practice: client components import ./types, never this.
 */

const TYPE_SLUGS = ['flats', 'independent-houses', 'builder-floors', 'villas', 'studio-apartments'] as const
const BHK_SLUGS = ['1-bhk', '2-bhk', '3-bhk', '4-bhk'] as const
// The price slugs are sale prices; rent has its own bands and no landing pages for them.
const BUDGET_SLUGS = ['under-25-lakh', 'under-50-lakh', 'under-1-crore', 'above-1-crore'] as const
const RENT_MORE_SLUGS = ['furnished', 'owner-properties', 'with-parking'] as const

const INTENT_PHRASE: Record<Intent, string> = { buy: 'for sale', rent: 'to rent' }

function hasListings(intent: Intent, city: string, slug: string): boolean {
  const patch = FILTER_SLUGS[slug]?.patch
  if (!patch) return false
  return searchProperties({ ...emptyQuery(intent, city), ...patch }).total > 0
}

function slugLinks(intent: Intent, city: string, slugs: readonly string[]): NavLink[] {
  return slugs
    .filter((slug) => hasListings(intent, city, slug))
    .map((slug) => ({
      label: FILTER_SLUGS[slug]!.label,
      href: buildLandingUrl({ intent, city, slug }),
      context: INTENT_PHRASE[intent],
    }))
}

function group(title: string, links: NavLink[]): NavGroup[] {
  return links.length ? [{ title, links }] : []
}

export function getMarketplaceNav(): MarketplaceNav {
  const city = LAUNCH_CITY.slug
  const cityName = LAUNCH_CITY.name

  const localities: LocalityNav[] = getPopularLocalities().slice(0, 8).map((l) => ({
    name: l.name,
    buy: buildLandingUrl({ intent: 'buy', city, locality: l.slug }),
    rent: buildLandingUrl({ intent: 'rent', city, locality: l.slug }),
  }))

  const sections: NavSection[] = [
    {
      id: 'buy',
      label: 'Buy',
      href: buildLandingUrl({ intent: 'buy', city }),
      summary: `Homes for sale in ${cityName}`,
      match: ['/buy'],
      lead: { label: `All homes for sale in ${cityName}`, href: buildLandingUrl({ intent: 'buy', city }) },
      groups: [
        ...group('Property type', slugLinks('buy', city, TYPE_SLUGS)),
        ...group('Bedrooms', slugLinks('buy', city, BHK_SLUGS)),
        ...group('Budget', slugLinks('buy', city, BUDGET_SLUGS)),
      ],
    },
    {
      id: 'rent',
      label: 'Rent',
      href: buildLandingUrl({ intent: 'rent', city }),
      summary: `Homes to rent in ${cityName}`,
      match: ['/rent'],
      lead: { label: `All homes to rent in ${cityName}`, href: buildLandingUrl({ intent: 'rent', city }) },
      groups: [
        ...group('Property type', slugLinks('rent', city, TYPE_SLUGS)),
        ...group('Bedrooms', slugLinks('rent', city, BHK_SLUGS)),
        ...group('More', slugLinks('rent', city, RENT_MORE_SLUGS)),
      ],
    },
    {
      id: 'localities',
      label: 'Localities',
      // The homepage section stands in until the city hub and locality
      // pages arrive (Phases 29 and 30).
      href: '/#localities',
      summary: `Areas across ${cityName}`,
      match: [],
      lead: { label: `Explore localities in ${cityName}`, href: '/#localities' },
      groups: [],
    },
    {
      id: 'loans',
      label: 'Home loans',
      href: '/calculators',
      summary: 'EMI and budget calculators',
      match: ['/calculators'],
      lead: { label: 'All home loan calculators', href: '/calculators' },
      // Titles from the calculators' own catalogue, so a rename there
      // reaches the navigation.
      groups: [{ title: 'Calculators', links: CALCULATORS.map(({ title, href }) => ({ label: title, href })) }],
    },
  ]

  return { city, sections, localities }
}
