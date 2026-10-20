import { describe, expect, it } from 'vitest'
import { attributesOf, contactOfProperty, overviewOfProperty } from './overview'
import { getPropertyDetail } from './queries'
import { overviewOfListing, contactOfListing, isPublishable } from '@/lib/listings/overview'
import type { PreviewModel } from '@/lib/preview/model'

describe('property overview (UI-16)', () => {
  it('maps a fixture to the summary in the buyer\'s order, with only fields it holds', () => {
    const p = getPropertyDetail('p_5d40ab')!
    const o = overviewOfProperty(p)
    expect(o.name).toBe(p.society ?? p.title)
    expect(o.rateArea).toBe(p.carpetArea)
    expect(o.sharePath).toMatch(/^\/property\/.+-p5d40ab$/)
    expect(o.extras.every((e) => !/undefined|null/.test(e))).toBe(true)
    expect(contactOfProperty(p).target).toEqual({ listingPublicId: p.publicId })
  })

  it('states availability and possession only when the seller gave them', () => {
    expect(attributesOf({ furnishing: 'FURNISHED' })).toEqual(['Furnished'])
    expect(attributesOf({ furnishing: 'UNFURNISHED', availableNow: true, floor: 0, totalFloors: 4 })).toEqual(['Unfurnished', 'Available now', 'Ground floor of 4'])
    expect(attributesOf({ furnishing: 'SEMI_FURNISHED', possessionBy: '2026-09' })).toEqual(['Semi-furnished', 'Possession by Sep 2026'])
  })

  it('maps a real listing without inventing what it lacks', () => {
    const model = {
      title: '2 BHK flat / apartment for sale in New Town', locality: 'New Town', city: 'Kolkata', sellerName: 'Asha Roy',
      entry: { role: 'OWNER', intent: 'buy', type: 'APARTMENT' }, media: [], description: null, carpetSqft: 1000,
      location: { cityId: 'kolkata', localityId: 'new-town', address: '12 Street', societyName: undefined },
      facts: { bedrooms: 2, bathrooms: 2, areaUnit: 'sqft', carpetArea: 1000, furnishing: 'UNFURNISHED', totalFloors: 8, floor: 3, constructionStatus: 'READY', ageYears: 4 },
      pricing: { intent: 'buy', price: 6_000_000, negotiable: false, maintenance: { status: 'unknown' } },
    } as unknown as PreviewModel
    expect(isPublishable(model)).toBe(true)
    if (!isPublishable(model)) return
    const o = overviewOfListing(model, { sharePath: '/listing/x' })
    expect(o.name).toBe(model.title) // no society named: the title
    expect(o.extras).toEqual(['Non-negotiable']) // "maintenance not specified" is left out
    expect(o.badges).toEqual([]) // no posting date, no "New"
    expect(o.attributes).toEqual(['Unfurnished', 'Floor 3 of 8'])
    const c = contactOfListing(model, 'id-1')
    expect(c.target).toEqual({ listingId: 'id-1' })
    expect(c.seller).toMatchObject({ sellerType: 'OWNER', sellerName: 'Asha Roy' })
  })
})
