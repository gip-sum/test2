import { describe, expect, it } from 'vitest'
import { getAllLocalitySlugs } from '@/lib/location/queries'
import { searchProperties } from '@/lib/property/search'
import { canonicalSearchUrl, parseSearchQuery } from '@/lib/search/query'
import { getDiscoveryHub, getMarketplaceNav } from './marketplace'
import type { DiscoveryHub, HubEntry } from './types'

const known = new Set(getAllLocalitySlugs())

function parse(href: string) {
  const url = new URL(href, 'https://example.test')
  const [, intent, city, ...segments] = url.pathname.split('/')
  return parseSearchQuery({ intent: intent!, city: city!, segments, params: url.searchParams, isKnownLocality: (s) => known.has(s) })
}

const entries = (hub: DiscoveryHub): HubEntry[] =>
  [...hub.explore, ...hub.types, ...hub.discover, ...hub.localities, ...hub.tools, ...hub.account, hub.sell.post, ...hub.sell.more]
const hrefs = (hub: DiscoveryHub) => entries(hub).flatMap((e) => [e.href, ...(e.pills ?? []).map((p) => p.href)]).filter((h): h is string => Boolean(h))

// Every page the app has (app/**/page.tsx), as the hub may address them.
const ROUTES = [
  /^\/#localities$/,
  /^\/(buy|rent)\/kolkata(\/[a-z0-9-]+){0,2}$/,
  /^\/calculators\/(emi|budget)$/,
  /^\/account(\/saved|\/enquiries)?$/,
  /^\/dashboard\/enquiries$/,
  /^\/post$/,
]

// Destinations the product has not built. "Builder floors" is a property type.
const FUTURE = /\b(commercial|plots?|land|projects?|agents?|builders?(?! floors?)|insights?|price trends?|compare|comparison|guides?|faqs?|my properties)\b/i

describe('discovery hub', () => {
  const hub = getDiscoveryHub()

  it('links only to pages the app has', () => {
    const unknown = hrefs(hub).filter((h) => !ROUTES.some((r) => r.test(h)))
    expect(unknown).toEqual([])
  })

  it('offers nothing the product has not built', () => {
    const words = entries(hub).flatMap((e) => [e.label, e.hint ?? '', ...(e.pills ?? []).map((p) => `${p.label} ${p.context ?? ''}`)])
    expect(words.filter((w) => FUTURE.test(w))).toEqual([])
  })

  it('links every search at its canonical URL, so the menu adds no second address for a page', () => {
    const searches = hrefs(hub).filter((h) => /^\/(buy|rent)\//.test(h))
    expect(searches.length).toBeGreaterThan(20)
    for (const href of searches) expect(canonicalSearchUrl(parse(href))).toBe(href)
  })

  it('offers a Buy or Rent pill only where that search has listings', () => {
    const pills = [...hub.types, ...hub.discover].flatMap((e) => e.pills ?? [])
    expect(pills.length).toBeGreaterThan(0)
    for (const p of pills) expect(searchProperties(parse(p.href)).total, p.href).toBeGreaterThan(0)
  })

  it('names every pill fully for a screen reader', () => {
    for (const e of [...hub.types, ...hub.discover, ...hub.localities]) {
      for (const p of e.pills ?? []) expect(p.context, `${e.label} ${p.label}`).toBeTruthy()
    }
  })

  it('keeps construction status a sale question', () => {
    const construction = hub.discover.filter((e) => e.id === 'ready-to-move' || e.id === 'under-construction')
    expect(construction.length).toBeGreaterThan(0)
    for (const e of construction) expect(e.pills?.every((p) => p.href.startsWith('/buy/'))).toBe(true)
  })

  it('gives every entry a unique id, and a way in', () => {
    const ids = entries(hub).map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const e of entries(hub)) expect(Boolean(e.href) || Boolean(e.pills?.length), e.id).toBe(true)
  })

  it('reaches the account and posting destinations the bottom bar has', () => {
    expect(hrefs(hub)).toEqual(expect.arrayContaining(['/account/saved', '/account/enquiries', '/account', '/post', '/dashboard/enquiries']))
  })

  it('is the hub the shared navigation model carries, so the header and the menu agree', () => {
    expect(getMarketplaceNav().hub).toEqual(hub)
  })
})

describe('discovery hub with nothing listed', () => {
  const hub = getDiscoveryHub(undefined, { corpus: [] })

  it('drops every type and collection rather than offering an empty page', () => {
    expect(hub.types).toEqual([])
    expect(hub.discover.map((e) => e.id)).toEqual(['localities'])
  })

  it('keeps each popular locality, with one way in that recovers with nearby places', () => {
    expect(hub.localities.length).toBeGreaterThan(0)
    for (const l of hub.localities) expect(l.pills?.map((p) => p.label)).toEqual(['Explore'])
  })

  it('keeps Buy, Rent, the calculators, the account and posting, which never depend on inventory', () => {
    expect(hub.explore.map((e) => e.id)).toEqual(['buy', 'rent'])
    expect(hub.tools.length).toBe(2)
    expect(hub.account.length).toBe(3)
    expect(hub.sell.post.href).toBe('/post')
  })
})
