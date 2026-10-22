import { describe, expect, it } from 'vitest'
import { groupForMap } from './areas'
import { getMapLocality } from '@/lib/location/queries'

const names = new Map([['nowhere-new', 'Nowhere New']])

describe('groupForMap', () => {
  it('draws a sub-locality at its locality, never finer', () => {
    const out = groupForMap([
      { slug: 'new-town', count: 4, minPrice: 50, maxPrice: 90 },
      { slug: 'new-town-action-area-i', count: 2, minPrice: 40, maxPrice: 70 },
    ], getMapLocality, names)
    expect(out.placed).toHaveLength(1)
    const [area] = out.placed
    expect(area).toMatchObject({ slug: 'new-town', name: 'New Town', count: 6, minPrice: 40, maxPrice: 90, members: ['new-town', 'new-town-action-area-i'] })
    expect(area!.centre).toEqual({ lat: 22.5760376, lng: 88.4718303 })
  })

  it('lists an area with no cited point as unplaced, at no position', () => {
    const out = groupForMap([
      { slug: 'em-bypass', count: 3, minPrice: 10, maxPrice: 20 },
      { slug: 'salt-lake', count: 5, minPrice: 10, maxPrice: 20 },
    ], getMapLocality, names)
    expect(out.placed.map((a) => a.slug)).toEqual(['salt-lake'])
    expect(out.unplaced).toEqual([{ slug: 'em-bypass', name: 'E M Bypass', count: 3, minPrice: 10, maxPrice: 20, members: ['em-bypass'] }])
    expect(out).toMatchObject({ placedCount: 5, unplacedCount: 3 })
  })

  it('keeps a locality the gazetteer does not know as its own unplaced area', () => {
    const out = groupForMap([{ slug: 'nowhere-new', count: 1, minPrice: 5, maxPrice: 5 }], getMapLocality, names)
    expect(out.placed).toEqual([])
    expect(out.unplaced[0]).toMatchObject({ slug: 'nowhere-new', name: 'Nowhere New', count: 1 })
  })

  it('orders areas by count, then name', () => {
    const out = groupForMap([
      { slug: 'garia', count: 2, minPrice: 1, maxPrice: 1 },
      { slug: 'behala', count: 2, minPrice: 1, maxPrice: 1 },
      { slug: 'howrah', count: 7, minPrice: 1, maxPrice: 1 },
    ], getMapLocality, names)
    expect(out.placed.map((a) => a.slug)).toEqual(['howrah', 'behala', 'garia'])
  })
})
