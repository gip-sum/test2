import { describe, it, expect } from 'vitest'
import { searchLocations, getLocationBySlug, getPopularLocalities } from './queries'

const names = (q: string) => searchLocations(q, 20).map((l) => l.name)

describe('searchLocations', () => {
  it('needs at least two characters', () => {
    expect(searchLocations('n')).toEqual([])
    expect(searchLocations(' ')).toEqual([])
  })

  it('matches on the locality name', () => {
    expect(names('bally')).toContain('Ballygunge')
  })

  it('resolves alternate spellings people actually type', () => {
    expect(names('bidhan')).toContain('Salt Lake')
    expect(names('bhawanipur')).toContain('Bhowanipore')
  })

  it('reaches sub-localities through their parent path', () => {
    // "Action Area III" contains no "New Town" in its own name.
    const results = names('new t')
    expect(results).toContain('New Town')
    expect(results).toContain('Action Area III')
  })

  it('ranks the locality itself above its sub-localities', () => {
    const results = names('new town')
    expect(results.indexOf('New Town')).toBeLessThan(results.indexOf('Action Area I'))
  })

  it('never returns the city itself as a locality suggestion', () => {
    expect(names('kolkata')).not.toContain('Kolkata')
  })

  it('returns nothing for a locality that does not exist', () => {
    expect(searchLocations('zzzzz')).toEqual([])
  })

  it('respects the limit', () => {
    expect(searchLocations('a', 3).length).toBeLessThanOrEqual(3)
  })
})

describe('lookup helpers', () => {
  it('finds a location by slug', () => {
    expect(getLocationBySlug('new-town')?.name).toBe('New Town')
    expect(getLocationBySlug('not-a-place')).toBeUndefined()
  })

  it('every popular locality resolves', () => {
    const popular = getPopularLocalities()
    expect(popular.length).toBeGreaterThan(6)
    expect(popular.every((l) => Boolean(l.slug))).toBe(true)
  })
})
