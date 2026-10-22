import { describe, expect, it } from 'vitest'
import { LOCALITY_CENTRES, UNPLACED } from './centres'
import { KOLKATA_LOCATIONS } from './kolkata'
import { getMapLocality } from './queries'

const localities = KOLKATA_LOCATIONS.filter((l) => l.type === 'LOCALITY')

/**
 * The independent reference each point was checked against (UI-21 Stage B):
 * the locality's coordinates as published on Wikipedia unless noted, read
 * 22 October 2026. Distances and sources: docs/data/locality-centres.md.
 * A point that drifts more than 2 km from its reference fails here; one
 * that cannot be brought back belongs in UNPLACED.
 */
const REFERENCE: Record<string, [number, number]> = {
  'new-town': [22.5894, 88.4748],
  'salt-lake': [22.58, 88.42],
  'lake-town': [22.603037, 88.404029], // findlatitudeandlongitude.com
  'dum-dum': [22.6352, 88.4143],
  madhyamgram: [22.7, 88.45],
  barasat: [22.72, 88.48], // WorldAtlas
  ballygunge: [22.529, 88.362],
  tollygunge: [22.498, 88.346],
  jadavpur: [22.5025, 88.3676],
  garia: [22.4629, 88.3968],
  behala: [22.4981, 88.3108],
  alipore: [22.5392, 88.3273],
  santoshpur: [22.491, 88.383],
  narendrapur: [22.4391, 88.3968],
  sonarpur: [22.4409, 88.4246],
  joka: [22.453, 88.301],
  thakurpukur: [22.465, 88.307],
  'park-street': [22.55445, 88.34985], // the street's metro station
  maniktala: [22.585, 88.375],
  shyambazar: [22.601, 88.374],
  ultadanga: [22.59225, 88.389528],
  howrah: [22.58, 88.32944],
  'uttarpara-kotrung': [22.67, 88.35],
  barrackpore: [22.76, 88.37],
  serampore: [22.75, 88.3333],
}
const km = ([a, b]: [number, number], [c, d]: [number, number]) => {
  const r = Math.PI / 180, h = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

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

  it('keeps every point within 2 km of its independent reference', () => {
    expect(Object.keys(REFERENCE).sort()).toEqual(Object.keys(LOCALITY_CENTRES).sort())
    for (const [slug, c] of Object.entries(LOCALITY_CENTRES)) expect(km([c.lat, c.lng], REFERENCE[slug]!), slug).toBeLessThanOrEqual(2)
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
