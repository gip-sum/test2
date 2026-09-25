import { describe, it, expect } from 'vitest'
import { searchLocations, getLocationBySlug, getPopularLocalities, getAllLocalitySlugs, getLocationById, getCityLocalities } from './queries'
import { KOLKATA_LOCATIONS } from './kolkata'

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

  it('indexes every locality in the city once, alphabetically, and nothing else', () => {
    const all = getCityLocalities()
    expect(all.every((l) => l.type === 'LOCALITY')).toBe(true)
    expect(new Set(all.map((l) => l.slug)).size).toBe(all.length)
    expect(all.map((l) => l.name)).toEqual([...all.map((l) => l.name)].sort((a, b) => a.localeCompare(b)))
    expect(all.length).toBe(KOLKATA_LOCATIONS.filter((l) => l.type === 'LOCALITY').length)
    // The popular tiles are a subset of the full index beneath them.
    const slugs = new Set(all.map((l) => l.slug))
    expect(getPopularLocalities().every((l) => slugs.has(l.slug))).toBe(true)
  })
})

describe('societies are places, not filters', () => {
  it('excludes societies from the slugs a route will accept as a locality', () => {
    const slugs = new Set(getAllLocalitySlugs())
    const society = KOLKATA_LOCATIONS.find((l) => l.type === 'SOCIETY')
    expect(society).toBeDefined()
    expect(slugs.has(society!.slug)).toBe(false)
  })

  it('never suggests a society in the typeahead', () => {
    // "Upohar" is a seeded society name; typing it must not offer a search
    // that would return nothing.
    const hits = searchLocations('upohar', 20)
    expect(hits.every((l) => l.type !== 'SOCIETY')).toBe(true)
  })

  it('still resolves a society by id, which is how a listing points at one', () => {
    const society = KOLKATA_LOCATIONS.find((l) => l.type === 'SOCIETY')!
    expect(getLocationById(society.id)?.name).toBe(society.name)
  })

  it('parents every society to a locality that exists', () => {
    const orphans = KOLKATA_LOCATIONS.filter(
      (l) => l.type === 'SOCIETY' && !KOLKATA_LOCATIONS.some((p) => p.slug === l.parentSlug),
    )
    expect(orphans).toEqual([])
  })
})
