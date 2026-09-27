import { describe, expect, it } from 'vitest'
import { DEMO_SUMMARIES } from '@/lib/property/demo-data'
import { searchProperties } from '@/lib/property/search'
import { getAllLocalitySlugs } from '@/lib/location/queries'
import { emptyQuery, parseSearchQuery } from '@/lib/search/query'
import {
  getBudgetDiscovery, getHomeCollections, getLocalityDiscovery, getSizeDiscovery, getTypeDiscovery,
} from './discovery'

/** The count a results page shows for a homepage link, read back from the link itself. */
function pageCount(href: string, intent: 'buy' | 'rent'): number {
  const url = new URL(href, 'https://example.test')
  const [, , city, ...rest] = url.pathname.split('/')
  const known = new Set(getAllLocalitySlugs())
  const q = parseSearchQuery({ intent, city: city!, segments: rest, params: url.searchParams, isKnownLocality: (slug) => known.has(slug) })
  return searchProperties(q).total
}

describe('homepage collections', () => {
  const rails = getHomeCollections()
  const byId = Object.fromEntries(rails.map((r) => [r.id, r]))

  it('are the four rails, in page order', () => {
    expect(rails.map((r) => r.id)).toEqual(['new-sale', 'new-rent', 'reduced', 'under-construction'])
  })

  it('never show a listing twice on the page', () => {
    const ids = rails.flatMap((r) => r.listings.map((p) => p.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never repeat a cover photo within a rail, and every card has one', () => {
    for (const r of rails) {
      const covers = r.listings.map((p) => p.photos[0]?.url)
      expect(covers.every(Boolean)).toBe(true)
      expect(new Set(covers).size).toBe(covers.length)
    }
  })

  it('hold only listings that are what the rail says', () => {
    expect(byId['new-sale']!.listings.every((p) => p.intent === 'buy')).toBe(true)
    expect(byId['new-rent']!.listings.every((p) => p.intent === 'rent')).toBe(true)
    expect(byId.reduced!.listings.length).toBeGreaterThan(0)
    expect(byId.reduced!.listings.every((p) => p.intent === 'buy' && p.isPriceReduced === true)).toBe(true)
    expect(byId['under-construction']!.listings.length).toBeGreaterThan(0)
    expect(byId['under-construction']!.listings.every((p) => p.constructionStatus === 'UNDER_CONSTRUCTION')).toBe(true)
  })

  it('are newest first', () => {
    for (const r of rails) {
      const dates = r.listings.map((p) => p.postedAt)
      expect([...dates].sort().reverse()).toEqual(dates)
    }
  })

  it('claim the total their "See all" page shows', () => {
    for (const r of rails) expect(r.total).toBe(pageCount(r.href, r.intent))
    expect(byId['new-sale']!.total).toBe(DEMO_SUMMARIES.filter((p) => p.intent === 'buy').length)
  })

  it('link to the results page\'s own forms, not new URLs', () => {
    expect(byId['new-sale']!.href).toBe('/buy/kolkata?sort=newest')
    expect(byId['under-construction']!.href).toBe('/buy/kolkata/under-construction')
  })

  it('are empty, not invented, when there is nothing listed', () => {
    const empty = getHomeCollections({ corpus: [] })
    expect(empty.every((r) => r.listings.length === 0 && r.total === 0)).toBe(true)
  })

  it('leave out listings without a photo, but still count them', () => {
    const noPhotos = DEMO_SUMMARIES.filter((p) => p.intent === 'buy').slice(0, 5).map((p) => ({ ...p, photos: [] }))
    const [sale] = getHomeCollections({ corpus: noPhotos })
    expect(sale!.listings).toHaveLength(0)
    expect(sale!.total).toBe(5)
  })
})

describe('homepage counts', () => {
  it('match the results page each locality tile links to', () => {
    const { popular, all } = getLocalityDiscovery()
    expect(popular.length).toBe(12)
    for (const tile of popular) {
      if (tile.forSale) expect(tile.forSale.count).toBe(pageCount(tile.forSale.href, 'buy'))
      if (tile.toRent) expect(tile.toRent.count).toBe(pageCount(tile.toRent.href, 'rent'))
      expect(tile.forSale?.href ?? `/buy/kolkata/${tile.slug}`).toBe(`/buy/kolkata/${tile.slug}`)
    }
    expect(popular.some((t) => t.toRent)).toBe(true)
    expect(all.length).toBeGreaterThanOrEqual(30)
  })

  it('match the results page for every type, budget band and size, and use landing pages where one exists', () => {
    const links = [
      ...getTypeDiscovery().flatMap((t) => [[t.forSale, 'buy'], [t.toRent, 'rent']] as const),
      ...(['buy', 'rent'] as const).flatMap((intent) => [...getBudgetDiscovery()[intent], ...getSizeDiscovery()[intent]].map((b) => [b, intent] as const)),
    ].filter(([l]) => l)
    expect(links.length).toBeGreaterThan(20)
    for (const [link, intent] of links) expect(link!.count).toBe(pageCount(link!.href, intent))
    expect(getTypeDiscovery().find((t) => t.type === 'APARTMENT')?.forSale?.href).toBe('/buy/kolkata/flats')
    expect(getSizeDiscovery().rent.find((s) => s.label === '2 BHK')?.href).toBe('/rent/kolkata/2-bhk')
    expect(getBudgetDiscovery().buy.find((b) => b.label === 'Up to ₹25 L')?.href).toBe('/buy/kolkata/under-25-lakh')
  })

  it('leave out every band, size and type with nothing in it', () => {
    const only = DEMO_SUMMARIES.filter((p) => p.intent === 'buy' && p.bedrooms === 2 && p.propertyType === 'APARTMENT')
    const sizes = getSizeDiscovery({ corpus: only })
    expect(sizes.buy.map((s) => s.label)).toEqual(['2 BHK'])
    expect(sizes.rent).toEqual([])
    expect(getTypeDiscovery({ corpus: only }).map((t) => t.type)).toEqual(['APARTMENT'])
    expect(getTypeDiscovery({ corpus: only })[0]!.toRent).toBeNull()
    const budget = getBudgetDiscovery({ corpus: only })
    expect(budget.buy.every((b) => b.count > 0)).toBe(true)
    expect(budget.rent).toEqual([])
  })

  it('offer nothing at all from an empty corpus — no zeros, no dead links', () => {
    expect(getTypeDiscovery({ corpus: [] })).toEqual([])
    expect(getBudgetDiscovery({ corpus: [] })).toEqual({ buy: [], rent: [] })
    expect(getSizeDiscovery({ corpus: [] })).toEqual({ buy: [], rent: [] })
    expect(getLocalityDiscovery({ corpus: [] }).popular.every((t) => !t.forSale && !t.toRent)).toBe(true)
  })

  it('do not count rent for a sale-only filter', () => {
    expect(searchProperties({ ...emptyQuery('rent'), construction: 'UNDER_CONSTRUCTION' }).total).toBe(0)
  })
})
