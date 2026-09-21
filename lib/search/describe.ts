import {
  AMENITY_LABEL,
  CONSTRUCTION_LABEL,
  FACING_LABEL,
  FURNISHING_LABEL,
  PROPERTY_TYPE_LABEL,
  PROPERTY_TYPE_PLURAL,
  SELLER_LABEL,
} from '@/lib/property/types'
import { formatPrice, formatRent } from '@/lib/format/price'
import { POSTED_SINCE_LABEL, type SearchQuery } from './query'

/**
 * The active filters, as the user would say them.
 *
 * Pure and separate from the chip component so the wording can be tested
 * without rendering anything. Each entry carries the patch that removes
 * exactly itself — one value out of a multi-select, or the whole bound out
 * of a range — so a chip never has to know how the filter is stored.
 */
export type ActiveFilter = {
  /** Stable within a render; used as a React key. */
  id: string
  label: string
  /** Applied to the query to remove this one filter. */
  remove: Partial<SearchQuery>
}

function money(intent: SearchQuery['intent'], v: number): string {
  return intent === 'rent' ? formatRent(v) : formatPrice(v)
}

export function describeActiveFilters(
  q: SearchQuery,
  localityNames?: Map<string, string>,
): ActiveFilter[] {
  const out: ActiveFilter[] = []
  const name = (slug: string) => localityNames?.get(slug) ?? slug

  for (const slug of q.localities) {
    out.push({
      id: `loc:${slug}`,
      label: name(slug),
      remove: { localities: q.localities.filter((s) => s !== slug) },
    })
  }
  for (const t of q.propertyTypes) {
    out.push({
      id: `type:${t}`,
      label: PROPERTY_TYPE_LABEL[t],
      remove: { propertyTypes: q.propertyTypes.filter((v) => v !== t) },
    })
  }
  for (const n of q.bedrooms) {
    out.push({
      id: `bhk:${n}`,
      label: `${n} BHK`,
      remove: { bedrooms: q.bedrooms.filter((v) => v !== n) },
    })
  }

  if (q.priceMin != null || q.priceMax != null) {
    const label =
      q.priceMin != null && q.priceMax != null
        ? `${money(q.intent, q.priceMin)} – ${money(q.intent, q.priceMax)}`
        : q.priceMax != null
          ? `Up to ${money(q.intent, q.priceMax)}`
          : `Above ${money(q.intent, q.priceMin!)}`
    out.push({ id: 'price', label, remove: { priceMin: undefined, priceMax: undefined } })
  }

  if (q.areaMin != null || q.areaMax != null) {
    const label =
      q.areaMin != null && q.areaMax != null
        ? `${q.areaMin}–${q.areaMax} sqft carpet`
        : q.areaMax != null
          ? `Up to ${q.areaMax} sqft carpet`
          : `From ${q.areaMin} sqft carpet`
    out.push({ id: 'area', label, remove: { areaMin: undefined, areaMax: undefined } })
  }

  if (q.psfMax != null) {
    out.push({
      id: 'psf',
      label: `Up to ₹${q.psfMax.toLocaleString('en-IN')}/sqft`,
      remove: { psfMax: undefined },
    })
  }
  if (q.bathroomsMin != null) {
    out.push({
      id: 'bath',
      label: `${q.bathroomsMin}+ bathrooms`,
      remove: { bathroomsMin: undefined },
    })
  }
  for (const f of q.furnishing) {
    out.push({
      id: `furn:${f}`,
      label: FURNISHING_LABEL[f],
      remove: { furnishing: q.furnishing.filter((v) => v !== f) },
    })
  }
  if (q.construction) {
    out.push({
      id: 'cons',
      label: CONSTRUCTION_LABEL[q.construction],
      remove: { construction: undefined },
    })
  }
  if (q.ageMax != null) {
    out.push({
      id: 'age',
      label: q.ageMax === 1 ? 'Under 1 year old' : `Up to ${q.ageMax} years old`,
      remove: { ageMax: undefined },
    })
  }
  if (q.floorMin != null || q.floorMax != null) {
    const label =
      q.floorMin != null && q.floorMax != null
        ? `Floor ${q.floorMin}–${q.floorMax}`
        : q.floorMax != null
          ? `Up to floor ${q.floorMax}`
          : `Floor ${q.floorMin} and above`
    out.push({ id: 'floor', label, remove: { floorMin: undefined, floorMax: undefined } })
  }
  for (const f of q.facing) {
    out.push({
      id: `face:${f}`,
      label: `${FACING_LABEL[f]} facing`,
      remove: { facing: q.facing.filter((v) => v !== f) },
    })
  }
  if (q.parkingMin != null) {
    out.push({
      id: 'park',
      label: q.parkingMin === 1 ? 'Has parking' : `${q.parkingMin}+ parking`,
      remove: { parkingMin: undefined },
    })
  }
  for (const a of q.amenities) {
    out.push({
      id: `amen:${a}`,
      label: AMENITY_LABEL[a],
      remove: { amenities: q.amenities.filter((v) => v !== a) },
    })
  }
  for (const s of q.sellerTypes) {
    out.push({
      id: `seller:${s}`,
      label: SELLER_LABEL[s],
      remove: { sellerTypes: q.sellerTypes.filter((v) => v !== s) },
    })
  }
  if (q.postedSince) {
    out.push({
      id: 'since',
      label: POSTED_SINCE_LABEL[q.postedSince],
      remove: { postedSince: undefined },
    })
  }
  if (q.withPhotosOnly) {
    out.push({ id: 'photos', label: 'With photos', remove: { withPhotosOnly: undefined } })
  }
  if (q.priceReducedOnly) {
    out.push({ id: 'reduced', label: 'Price reduced', remove: { priceReducedOnly: undefined } })
  }
  if (q.availableBy) {
    out.push({
      id: 'by',
      label: `Available by ${q.availableBy}`,
      remove: { availableBy: undefined },
    })
  }
  return out
}

/** The patch that clears every filter but keeps intent, city and sort. */
export function clearAllPatch(): Partial<SearchQuery> {
  return {
    localities: [],
    propertyTypes: [],
    bedrooms: [],
    furnishing: [],
    facing: [],
    amenities: [],
    sellerTypes: [],
    priceMin: undefined,
    priceMax: undefined,
    areaMin: undefined,
    areaMax: undefined,
    psfMax: undefined,
    bathroomsMin: undefined,
    construction: undefined,
    ageMax: undefined,
    floorMin: undefined,
    floorMax: undefined,
    parkingMin: undefined,
    postedSince: undefined,
    withPhotosOnly: undefined,
    priceReducedOnly: undefined,
    availableBy: undefined,
  }
}

/**
 * The H1 and <title> for a result set.
 *
 * Built from the query rather than stored per landing page, so a new
 * locality or filter never needs a copy change to get a correct heading.
 */
export function describeSearch(
  q: SearchQuery,
  cityName: string,
  localityNames?: Map<string, string>,
): string {
  const bhk = q.bedrooms.length ? `${[...q.bedrooms].sort((a, b) => a - b).join(', ')} BHK ` : ''
  // "property" is already both singular and plural; every real type needs
  // its own plural form.
  const what =
    q.propertyTypes.length === 1
      ? PROPERTY_TYPE_PLURAL[q.propertyTypes[0]!].toLowerCase()
      : 'property'
  const where = q.localities.length
    ? q.localities.map((s) => localityNames?.get(s) ?? s).join(', ')
    : cityName
  const verb = q.intent === 'rent' ? 'for rent' : 'for sale'
  return `${bhk}${what} ${verb} in ${where}`.replace(/\s+/g, ' ').trim()
}
