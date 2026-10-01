import type { Location } from '@/lib/location/types'
import type { EntryInput } from './entry'

export const LOCATION_KEYS = ['city', 'locality', 'sublocality', 'society', 'address', 'lat', 'lng'] as const
export type LocationKey = (typeof LOCATION_KEYS)[number]
export type LocationInput = Partial<Record<LocationKey, string>>
export type LocationErrors = Partial<Record<LocationKey, string>>
export type PropertyLocation = {
  cityId: string
  localityId: string
  subLocalityId?: string
  /** Collection value, not a verified society record. */
  societyName?: string
  address: string
  coordinates?: { lat: number; lng: number; source: 'seller-provided' }
}
const LIMITS: Record<LocationKey, number> = { city: 80, locality: 80, sublocality: 80, society: 120, address: 240, lat: 24, lng: 24 }

export function readLocationInput(input: EntryInput): LocationInput {
  const result: LocationInput = {}
  for (const key of LOCATION_KEYS) {
    const value = input[key]
    // Oversized and duplicate answers become invalid markers on submission;
    // never truncate an address or silently choose one coordinate.
    if (typeof value === 'string') result[key] = value.length <= LIMITS[key] ? value : '�'
    else if (value !== undefined) result[key] = '�'
  }
  return result
}

export function locationPairs(input: LocationInput): [LocationKey, string][] {
  return LOCATION_KEYS.flatMap((key) => input[key] === undefined ? [] : [[key, input[key]!] as [LocationKey, string]])
}

const normalise = (text: string) => text.normalize('NFC').trim().replace(/\s+/gu, ' ')

export function validateLocation(input: LocationInput, places: readonly Location[]):
  { ok: true; location: PropertyLocation; values: LocationInput } | { ok: false; errors: LocationErrors } {
  const errors: LocationErrors = {}
  const value = (key: LocationKey) => (input[key] ?? '').trim()
  const city = places.find((p) => p.slug === value('city') && p.type === 'CITY' && p.slug === 'kolkata')
  if (!city) errors.city = 'Choose Kolkata; posting is currently available in Kolkata only'
  const locality = places.find((p) => p.slug === value('locality') && p.type === 'LOCALITY' && p.parentSlug === city?.slug)
  if (!locality) errors.locality = 'Choose a locality in Kolkata'
  const sub = value('sublocality') ? places.find((p) => p.slug === value('sublocality') && p.type === 'SUB_LOCALITY' && p.parentSlug === locality?.slug) : undefined
  if (value('sublocality') && !sub) errors.sublocality = 'Choose a sub-locality belonging to your locality, or leave it blank'

  const text = (key: 'society' | 'address', required: boolean) => {
    const raw = input[key] ?? ''
    const cleaned = normalise(raw)
    if (required && cleaned.length < 5) errors[key] = 'Enter the building or street address, using at least 5 characters'
    else if (raw.length > LIMITS[key] || /[<>�\p{Cc}\p{Cf}]/u.test(raw.replace(/[\n\r\t]/g, ''))) errors[key] = `Enter plain text of at most ${LIMITS[key]} characters, without markup or control characters`
    return cleaned
  }
  const societyName = text('society', false)
  const address = text('address', true)

  const coordinate = (key: 'lat' | 'lng', min: number, max: number) => {
    const raw = value(key)
    if (!/^-?\d{1,3}(?:\.\d{1,6})?$/.test(raw)) {
      errors[key] = `Enter ${key === 'lat' ? 'latitude' : 'longitude'} in decimal degrees, with up to 6 decimal places`
      return undefined
    }
    const n = Number(raw)
    if (!Number.isFinite(n) || n < min || n > max) {
      errors[key] = `Enter a value between ${min} and ${max} for the Kolkata metropolitan area`
      return undefined
    }
    return n
  }
  let lat: number | undefined
  let lng: number | undefined
  if (value('lat') || value('lng')) {
    lat = coordinate('lat', 21.8, 23.3)
    lng = coordinate('lng', 87.8, 89)
  }
  if (Object.values(errors).some(Boolean) || !city || !locality) return { ok: false, errors }
  const location: PropertyLocation = {
    cityId: city.id, localityId: locality.id,
    ...(sub ? { subLocalityId: sub.id } : {}),
    ...(societyName ? { societyName } : {}), address,
    ...(lat !== undefined && lng !== undefined ? { coordinates: { lat, lng, source: 'seller-provided' as const } } : {}),
  }
  const values: LocationInput = {
    city: city.slug, locality: locality.slug,
    ...(sub ? { sublocality: sub.slug } : {}),
    ...(societyName ? { society: societyName } : {}), address,
    ...(location.coordinates ? { lat: String(lat), lng: String(lng) } : {}),
  }
  return { ok: true, location, values }
}
