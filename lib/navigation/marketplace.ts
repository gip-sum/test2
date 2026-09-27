import { cache } from 'react'
import { CALCULATORS } from '@/components/calculators/catalogue'
import { LAUNCH_CITY } from '@/lib/brand'
import { getPopularLocalities } from '@/lib/location/queries'
import { searchProperties } from '@/lib/property/search'
import type { Intent, PropertySummary } from '@/lib/property/types'
import { buildLandingUrl, emptyQuery, FILTER_SLUGS, type SearchQuery } from '@/lib/search/query'
import type { DiscoveryHub, HubEntry, LocalityNav, MarketplaceNav, NavGroup, NavLink, NavSection } from './types'

/**
 * Every destination the marketplace shell offers (Phase A), built in one
 * place so the desktop header's panels, the phone menu and the quick
 * routes' "View all" cannot drift apart.
 *
 * Two rules, both from "nothing claims more than it knows":
 *  • Only routes that exist. Projects, agents, builders, insights,
 *    commercial, plots, comparison, guides, FAQs and a seller's own
 *    listings have no pages yet; they wait in "Navigation destinations
 *    waiting on their phase" in docs/ROADMAP.md and join this list — as
 *    one hub entry, reaching the phone menu and the desktop panel — when
 *    they ship. None is shown as "coming soon".
 *  • Only filters with something behind them. A type, size or budget link
 *    appears for an intent only when that search returns listings, so the
 *    navigation never leads to an empty page. The check runs through the
 *    search seam, so it stays true when fixtures become a database.
 *
 * Links are landing URLs (buildLandingUrl), the same pretty paths the
 * footer emits, never a hand-written query string.
 *
 * Server-only in practice: client components import ./types, never this.
 *
 * The corpus option exists for tests of the sparse and empty states; left
 * out, the search seam uses the live inventory.
 */

type Options = { corpus?: PropertySummary[] }

const TYPE_SLUGS = ['flats', 'independent-houses', 'builder-floors', 'villas', 'studio-apartments'] as const
const BHK_SLUGS = ['1-bhk', '2-bhk', '3-bhk', '4-bhk'] as const
// The price slugs are sale prices; rent has its own bands and no landing pages for them.
const BUDGET_SLUGS = ['under-25-lakh', 'under-50-lakh', 'under-1-crore', 'above-1-crore'] as const
const RENT_MORE_SLUGS = ['furnished', 'owner-properties', 'with-parking'] as const

const INTENT_PHRASE: Record<Intent, string> = { buy: 'for sale', rent: 'to rent' }

function count(intent: Intent, city: string, patch: Partial<SearchQuery>, options?: Options): number {
  return searchProperties({ ...emptyQuery(intent, city), ...patch }, { corpus: options?.corpus }).total
}

function hasListings(intent: Intent, city: string, slug: string, options?: Options): boolean {
  const patch = FILTER_SLUGS[slug]?.patch
  return patch ? count(intent, city, patch, options) > 0 : false
}

function slugLinks(intent: Intent, city: string, slugs: readonly string[], options?: Options): NavLink[] {
  return slugs
    .filter((slug) => hasListings(intent, city, slug, options))
    .map((slug) => ({
      label: FILTER_SLUGS[slug]!.label,
      href: buildLandingUrl({ intent, city, slug }),
      context: INTENT_PHRASE[intent],
    }))
}

function group(title: string, links: NavLink[]): NavGroup[] {
  return links.length ? [{ title, links }] : []
}

/**
 * Cached per request: the header and the bottom bar (Phase D) both need
 * it, and building it runs a search per link.
 */
export const getMarketplaceNav = cache(buildMarketplaceNav)

function buildMarketplaceNav(options?: Options): MarketplaceNav {
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
        ...group('Property type', slugLinks('buy', city, TYPE_SLUGS, options)),
        ...group('Bedrooms', slugLinks('buy', city, BHK_SLUGS, options)),
        ...group('Budget', slugLinks('buy', city, BUDGET_SLUGS, options)),
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
        ...group('Property type', slugLinks('rent', city, TYPE_SLUGS, options)),
        ...group('Bedrooms', slugLinks('rent', city, BHK_SLUGS, options)),
        ...group('More', slugLinks('rent', city, RENT_MORE_SLUGS, options)),
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

  return { city, sections, localities, hub: getDiscoveryHub(city, options) }
}

// ── The discovery hub (Phase C) ─────────────────────────────────────────

const INTENTS: Intent[] = ['buy', 'rent']
const PILL: Record<Intent, string> = { buy: 'Buy', rent: 'Rent' }

/**
 * Buy and Rent links for a landing slug, only where that search has
 * listings; `noun` completes each for a screen reader ("Buy flats").
 */
function pills(city: string, slug: string, noun: string, intents: Intent[], options?: Options): NavLink[] {
  return intents
    .filter((intent) => hasListings(intent, city, slug, options))
    .map((intent) => ({ label: PILL[intent], href: buildLandingUrl({ intent, city, slug }), context: noun }))
}

/** An entry offered through its pills; with none, it is not offered at all. */
function pillEntry(entry: Omit<HubEntry, 'pills'>, links: NavLink[]): HubEntry[] {
  return links.length ? [{ ...entry, pills: links }] : []
}

/**
 * Types in the order people ask for them. The label is the landing page's
 * own (FILTER_SLUGS), so the menu and the page it opens use one word.
 */
const HUB_TYPES = [
  { slug: 'flats', noun: 'flats' },
  { slug: 'independent-houses', noun: 'independent houses' },
  { slug: 'builder-floors', noun: 'builder floors' },
  { slug: 'villas', noun: 'villas' },
  { slug: 'studio-apartments', noun: 'studio apartments' },
] as const

export function getDiscoveryHub(city: string = LAUNCH_CITY.slug, options?: Options): DiscoveryHub {
  const cityName = LAUNCH_CITY.name

  return {
    // Always offered, even with nothing listed: the results page for an
    // empty intent says so and invites the first listing.
    explore: [
      { id: 'buy', label: 'Buy', href: buildLandingUrl({ intent: 'buy', city }), hint: `Homes for sale in ${cityName}` },
      { id: 'rent', label: 'Rent', href: buildLandingUrl({ intent: 'rent', city }), hint: `Homes to rent in ${cityName}` },
    ],

    types: HUB_TYPES.flatMap(({ slug, noun }) =>
      pillEntry({ id: slug, label: FILTER_SLUGS[slug]!.label }, pills(city, slug, noun, INTENTS, options))),

    discover: [
      // The homepage section stands in for the localities index until the
      // city hub and locality pages arrive (Phases 29 and 30).
      { id: 'localities', label: `Localities in ${cityName}`, href: '/#localities', hint: 'What each area holds, for sale and to rent' },
      // Construction status is a sale question: every rental is ready to
      // move into, so "Rent ready to move" would be every rental twice.
      ...pillEntry({ id: 'ready-to-move', label: 'Ready to move', hint: 'Finished homes you can move into' },
        pills(city, 'ready-to-move', 'ready-to-move homes', ['buy'], options)),
      // Listings of homes still being built — not projects, which are a
      // separate entity that does not exist yet (Phases 44–47).
      ...pillEntry({ id: 'under-construction', label: 'Under construction', hint: 'Homes still being built' },
        pills(city, 'under-construction', 'homes under construction', ['buy'], options)),
      ...pillEntry({ id: 'owner-properties', label: 'Posted by owners', hint: 'Listed by the person who owns the home' },
        pills(city, 'owner-properties', 'homes posted by owners', INTENTS, options)),
    ],

    localities: getPopularLocalities().slice(0, 8).map((l) => {
      const links = INTENTS
        .filter((intent) => count(intent, city, { localities: [l.slug] }, options) > 0)
        .map((intent) => ({ label: PILL[intent], href: buildLandingUrl({ intent, city, locality: l.slug }), context: `in ${l.name}` }))
      // A popular place with nothing listed keeps one way in: its sale
      // results, which suggest the places nearby. Dropping it would make a
      // well-known area look missing from the city (as on the homepage).
      return {
        id: `locality-${l.slug}`,
        label: l.name,
        pills: links.length ? links : [{ label: 'Explore', href: buildLandingUrl({ intent: 'buy', city, locality: l.slug }), context: l.name }],
      }
    }),

    // From the calculators' own catalogue, so a rename there reaches here.
    tools: CALCULATORS.map(({ title, href, summary }) => ({ id: href.split('/').pop()!, label: title, href, hint: summary })),

    account: [
      { id: 'saved', label: 'Saved homes', href: '/account/saved', hint: 'The shortlist you are building' },
      { id: 'enquiries', label: 'Your enquiries', href: '/account/enquiries', hint: 'Every listing you have asked about' },
      { id: 'account', label: 'Profile and preferences', href: '/account', hint: 'Your details, sign-in and the home you want' },
    ],

    sell: {
      post: { id: 'post', label: 'Post a property', href: '/post', hint: 'List a home for sale or to rent' },
      // What an advertiser has today. The seller dashboard with their own
      // listings ("My properties") is Phase 19.
      more: [{ id: 'seller-enquiries', label: 'Enquiries on your listings', href: '/dashboard/enquiries', hint: 'Buyers and tenants who got in touch' }],
    },
  }
}
