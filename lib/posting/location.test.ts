import { describe, expect, it } from 'vitest'
import { getPostingLocations } from '@/lib/location/queries'
import { readLocationInput, validateLocation, type LocationInput } from './location'
import { resolvePosting } from './flow'

const places = getPostingLocations()
const base: LocationInput = { city: 'kolkata', locality: 'new-town', address: '  Building 4,   Main Road  ' }
const facts = { role: 'OWNER', intent: 'buy', type: 'APARTMENT', bhk: '2', baths: '2', unit: 'sqft', carpet: '900', furnishing: 'UNFURNISHED', floor: '2', floors: '5', status: 'READY', age: '3' }
const today = '2026-10-01'
const validate = (input: LocationInput) => validateLocation(input, places)

function errors(input: LocationInput) {
  const result = validate(input)
  if (result.ok) throw new Error('expected validation failure')
  return result.errors
}

describe('property location', () => {
  it('uses stable place identities and normalises text without inventing coordinates', () => {
    const result = validate(base)
    expect(result.ok && result.location).toEqual({ cityId: 'loc_kolkata', localityId: 'loc_new-town', address: 'Building 4, Main Road' })
    expect(result.ok && result.values).toEqual({ ...base, address: 'Building 4, Main Road' })
  })
  it('accepts the correct sub-locality and seller-stated society', () => {
    const result = validate({ ...base, sublocality: 'new-town-action-area-i', society: '  প্রকৃতি  আবাসন ', lat: '22.580000', lng: '88.460000' })
    expect(result.ok && result.location.subLocalityId).toBe('loc_new-town-action-area-i')
    expect(result.ok && result.location.societyName).toBe('প্রকৃতি আবাসন')
    expect(result.ok && result.location.coordinates).toEqual({ lat: 22.58, lng: 88.46, source: 'seller-provided' })
  })
  it('rejects an unknown city and wrong place levels', () => {
    expect(errors({ ...base, city: 'delhi' })).toHaveProperty('city')
    expect(errors({ ...base, locality: 'new-town-action-area-i' })).toHaveProperty('locality')
    expect(errors({ ...base, locality: 'new-town-upohar-luxury-residences' })).toHaveProperty('locality')
  })
  it('rejects a sub-locality outside its selected parent', () => {
    expect(errors({ ...base, sublocality: 'salt-lake-sector-v' })).toHaveProperty('sublocality')
    expect(errors({ ...base, sublocality: 'missing' })).toHaveProperty('sublocality')
  })
  it('reports every required empty answer', () => {
    expect(Object.keys(errors({}))).toEqual(['city', 'locality', 'address'])
  })
  it.each(['<script>alert(1)</script>', 'Street\u0000Name', 'Street\u202eName', 'a'.repeat(241)])('rejects unsafe or excessive address %j', (address) => {
    expect(errors({ ...base, address })).toHaveProperty('address')
  })
  it('normalises textarea newlines and accepts Indian scripts', () => {
    const result = validate({ ...base, address: 'বাড়ি ৪\nমূল রাস্তা' })
    expect(result.ok && result.location.address).toBe('বাড়ি ৪ মূল রাস্তা')
  })
  it.each(['NaN', 'Infinity', '2.258e1', '22.1234567', '91', '-22.5', '0'])('rejects invalid latitude %j', (lat) => {
    expect(errors({ ...base, lat, lng: '88.46' })).toHaveProperty('lat')
  })
  it.each(['77.2', '181', '-88.4', '88,460'])('rejects invalid longitude %j', (lng) => {
    expect(errors({ ...base, lat: '22.58', lng })).toHaveProperty('lng')
  })
  it('requires both coordinates and allows neither', () => {
    expect(errors({ ...base, lat: '22.58' })).toHaveProperty('lng')
    expect(errors({ ...base, lng: '88.46' })).toHaveProperty('lat')
    expect(validate({ ...base, lat: '', lng: '' }).ok).toBe(true)
  })
  it('accepts envelope boundaries and rejects outside them', () => {
    expect(validate({ ...base, lat: '21.8', lng: '87.8' }).ok).toBe(true)
    expect(validate({ ...base, lat: '23.3', lng: '89' }).ok).toBe(true)
    expect(errors({ ...base, lat: '23.300001', lng: '89' })).toHaveProperty('lat')
  })
  it.each(['city', 'locality', 'sublocality', 'society', 'address', 'lat', 'lng'] as const)('rejects duplicate or oversized %s without silently choosing a value', (key) => {
    expect(errors(readLocationInput({ ...base, [key]: ['first', 'second'] }))).toHaveProperty(key)
    expect(errors(readLocationInput({ ...base, [key]: 'a'.repeat(300) }))).toHaveProperty(key)
  })
  it('never suggests invented society fixtures to sellers', () => {
    expect(places.some((p) => p.type === 'SOCIETY')).toBe(false)
  })
})

describe('location stage in posting', () => {
  it('requires valid earlier choices and facts before reaching location', () => {
    expect(resolvePosting({ step: 'location-review', ...base }, today).view.stage).toBe('role')
    expect(resolvePosting({ ...facts, carpet: '', step: 'location-review', ...base }, today).view.stage).toBe('details')
  })
  it('opens the location form and preserves facts', () => {
    const result = resolvePosting({ ...facts, step: 'location' }, today)
    expect(result.view.stage).toBe('location')
    expect(result.view.carried.carpet).toBe('900')
    expect(result.view.stage === 'location' && result.view.errors).toEqual({})
  })
  it('canonicalises the combined review and remains stable on reload', () => {
    const result = resolvePosting({ ...facts, ...base, lat: '22.5800', lng: '88.4600', step: 'location-review', junk: 'x' }, today)
    expect(result.view.stage).toBe('location-review')
    expect(result.canonicalUrl).toContain('lat=22.58&lng=88.46&step=location-review')
    expect(result.canonicalUrl).not.toContain('junk')
    expect(resolvePosting(Object.fromEntries(new URL(result.canonicalUrl, 'http://x').searchParams), today).canonicalUrl).toBe(result.canonicalUrl)
  })
  it('keeps invalid location values on the form and reports errors', () => {
    const result = resolvePosting({ ...facts, ...base, sublocality: 'salt-lake-sector-v', step: 'location-review' }, today)
    expect(result.view.stage === 'location' && result.view.errors.sublocality).toBeTruthy()
    expect(result.view.locationCarried.sublocality).toBe('salt-lake-sector-v')
  })
  it('keeps location while editing facts and changing earlier choices', () => {
    const edit = resolvePosting({ ...facts, ...base, edit: '1' }, today)
    expect(edit.view.stage).toBe('details')
    expect(edit.view.locationCarried.address).toBe(base.address)
    const type = resolvePosting({ ...facts, ...base, type: undefined }, today)
    expect(type.view.stage).toBe('type')
    expect(type.view.locationCarried.locality).toBe('new-town')
  })
})
