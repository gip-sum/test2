import { describe, expect, it } from 'vitest'
import { LOCALITY_CENTRES, UNPLACED } from './centres'
import { KOLKATA_LOCATIONS } from './kolkata'
import { getMapLocality } from './queries'

const localities = KOLKATA_LOCATIONS.filter((l) => l.type === 'LOCALITY')

describe('locality centres', () => {
  it('accounts for every locality: a cited point or a stated reason, never both', () => {
    for (const l of localities) {
      const placed = l.slug in LOCALITY_CENTRES, unplaced = l.slug in UNPLACED
      expect(placed !== unplaced, l.slug).toBe(true)
    }
    for (const slug of [...Object.keys(LOCALITY_CENTRES), ...Object.keys(UNPLACED)]) {
      expect(localities.some((l) => l.slug === slug), slug).toBe(true)
    }
  })

  it('draws a sub-locality or society at its locality, never at a point of its own', () => {
    for (const l of KOLKATA_LOCATIONS.filter((p) => p.type === 'SUB_LOCALITY' || p.type === 'SOCIETY')) {
      const at = getMapLocality(l.slug)
      expect(at?.slug, l.slug).not.toBe(l.slug)
      expect(at?.centre, l.slug).toBe(at && LOCALITY_CENTRES[at.slug])
    }
  })

  it('keeps every point inside the Kolkata area and cites its record', () => {
    for (const [slug, c] of Object.entries(LOCALITY_CENTRES)) {
      expect(c.lat > 22.3 && c.lat < 22.95 && c.lng > 88.15 && c.lng < 88.6, slug).toBe(true)
      expect(c.reference.length, slug).toBeGreaterThan(3)
    }
  })

  it('uses no point twice: a shared point is a placeholder, not a place', () => {
    const seen = new Set<string>()
    for (const c of Object.values(LOCALITY_CENTRES)) {
      const key = `${c.lat},${c.lng}`
      expect(seen.has(key), key).toBe(false)
      seen.add(key)
    }
    // The directory's known placeholders (lib/location/centres.ts, check 1).
    expect(seen.has('22.5727778,88.3475')).toBe(false)
    expect(seen.has('22.5816944,88.3371944')).toBe(false)
    expect(seen.has('22.5553,88.3558')).toBe(false)
  })
})
