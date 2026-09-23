import { describe, it, expect } from 'vitest'
import { buildDemoProperties } from './demo-data'
import { getLocationById, getLocationBySlug } from '@/lib/location/queries'

/**
 * Guards the join between the listing fixture and the place gazetteer.
 *
 * These two files are edited independently and a mismatch is silent: a
 * listing whose localitySlug is not in the gazetteer still renders, still
 * counts, and still appears in results — it is simply unreachable by
 * locality, and the homepage chip for that place leads to an empty page.
 *
 * That is exactly what happened before Phase 4: the fixture said
 * 'e-m-bypass' and 'action-area-i' while the gazetteer said 'em-bypass'
 * and 'new-town-action-area-i', stranding fifteen listings. Nothing failed,
 * because nothing was checking the join.
 */
describe('fixture integrity', () => {
  const properties = buildDemoProperties(new Date('2026-09-22T00:00:00Z'))

  it('gives every listing a locality that exists in the gazetteer', () => {
    const orphans = properties
      .filter((p) => !getLocationBySlug(p.localitySlug))
      .map((p) => p.localitySlug)
    expect([...new Set(orphans)]).toEqual([])
  })

  it('agrees with the gazetteer on every locality display name', () => {
    const mismatches = properties
      .filter((p) => getLocationBySlug(p.localitySlug)?.name !== p.localityName)
      .map((p) => `${p.localitySlug}: fixture "${p.localityName}" vs gazetteer "${getLocationBySlug(p.localitySlug)?.name}"`)
    expect([...new Set(mismatches)]).toEqual([])
  })
})

describe('society links', () => {
  const properties = buildDemoProperties(new Date('2026-09-22T00:00:00Z'))

  it('resolves every societyLocationId to a real SOCIETY location', () => {
    const broken = properties
      .filter((p) => p.societyLocationId)
      .filter((p) => getLocationById(p.societyLocationId!)?.type !== 'SOCIETY')
      .map((p) => `${p.id}: ${p.societyLocationId}`)
    expect([...new Set(broken)]).toEqual([])
  })

  it('parents every linked society to the listing own locality', () => {
    const mismatched = properties
      .filter((p) => p.societyLocationId)
      .filter((p) => getLocationById(p.societyLocationId!)?.parentSlug !== p.localitySlug)
      .map((p) => `${p.id}: society in ${getLocationById(p.societyLocationId!)?.parentSlug}, listing in ${p.localitySlug}`)
    expect([...new Set(mismatched)]).toEqual([])
  })

  it('never links a society without also carrying the display name', () => {
    expect(properties.filter((p) => p.societyLocationId && !p.society)).toEqual([])
  })
})

describe('media', () => {
  const properties = buildDemoProperties(new Date('2026-09-22T00:00:00Z'))

  it('points every photo at a file that exists on disk', async () => {
    const { existsSync } = await import('node:fs')
    const missing = properties
      .flatMap((p) => p.photos)
      .map((m) => m.url)
      .filter((u): u is string => Boolean(u))
      .filter((u) => !existsSync(`public${u}`))
    expect([...new Set(missing)]).toEqual([])
  })

  it('gives every photo a meaningful alt that marks it as a sample', () => {
    const bad = properties
      .flatMap((p) => p.photos)
      .filter((m) => !m.alt || !m.alt.includes('sample image') || !m.isSample)
    expect(bad).toEqual([])
  })

  it('covers the gallery edge cases: none, exactly one, and many', () => {
    const counts = properties.map((p) => p.photos.length)
    expect(counts.filter((n) => n === 0).length).toBeGreaterThan(0)
    expect(counts.filter((n) => n === 1).length).toBeGreaterThan(0)
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(12)
  })
})

describe('detail fields', () => {
  const properties = buildDemoProperties(new Date('2026-09-22T00:00:00Z'))

  it('keeps carpet, built-up and super as three separate values', () => {
    const merged = properties.filter(
      (p) =>
        (p.builtUpArea != null && p.builtUpArea === p.carpetArea) ||
        (p.superArea != null && p.superArea === p.carpetArea),
    )
    expect(merged).toEqual([])
  })

  it('orders the three area bases correctly wherever all are present', () => {
    const wrong = properties
      .filter((p) => p.builtUpArea != null && p.superArea != null)
      .filter((p) => !(p.carpetArea < p.builtUpArea! && p.builtUpArea! < p.superArea!))
    expect(wrong).toEqual([])
  })

  it('covers a listing with no description and one over 1,500 characters', () => {
    expect(properties.some((p) => !p.description)).toBe(true)
    expect(properties.some((p) => (p.description?.length ?? 0) > 1500)).toBe(true)
  })

  it('only puts a deposit on a rental', () => {
    expect(properties.filter((p) => p.deposit != null && p.intent !== 'rent')).toEqual([])
  })
})
