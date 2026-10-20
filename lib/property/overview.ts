import type { AreaUnit } from '@/lib/format/area'
import { listingBadges, type ListingBadge } from './badges'
import { propertyPath } from './public-id'
import {
  FURNISHING_LABEL,
  type ConstructionStatus,
  type Furnishing,
  type Intent,
  type PropertyDetail,
  type PropertyTypeCode,
  type SellerType,
} from './types'

/**
 * What the top of a property page shows (UI-16), from either source: a
 * demo fixture (`/property/…`) or a real published listing (`/listing/…`).
 * One shape, so both pages render the one PropertyOverview and cannot
 * drift; each source has an adapter that maps only fields it holds.
 */
export type OverviewData = {
  name: string
  place: string
  intent: Intent
  /** Integer rupees: the sale price, or the monthly rent. */
  price: number
  /** Carpet area in square feet, for the rate; buy only. */
  rateArea?: number
  /** What else is payable or agreed: deposit, maintenance, negotiable. */
  extras: string[]
  badges: ListingBadge[]
  propertyType: PropertyTypeCode
  /** Absent for a studio. */
  bedrooms?: number
  bathrooms: number
  carpetArea: number
  areaUnit: AreaUnit
  constructionStatus: ConstructionStatus
  /** Furnishing, availability or possession, floor — the ones the listing states. */
  attributes: string[]
  /** The public address to copy; absent where the page is not public. */
  sharePath?: string
  postedAt?: string
}

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

export function formatFloor(floor: number | undefined, totalFloors: number | undefined): string | null {
  if (floor == null || totalFloors == null) return null
  return `${floor === 0 ? 'Ground floor' : `Floor ${floor}`} of ${totalFloors}`
}

// A fixed table, not toLocaleDateString: ICU builds disagree ("Sep" or
// "Sept" for en-IN), so a server and a browser, or CI and a laptop, could
// print the same date two ways.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `2026-11-04` → "4 Nov 2026", read as a calendar date (no time zone shift). */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`
}

/** `2026-09` → "Sep 2026". */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS[(m ?? 1) - 1]} ${y}`
}

export function attributesOf(facts: {
  furnishing: Furnishing
  floor?: number
  totalFloors?: number
  availableFrom?: string
  availableNow?: boolean
  possessionBy?: string
}): string[] {
  return [
    FURNISHING_LABEL[facts.furnishing],
    facts.availableNow ? 'Available now' : facts.availableFrom ? `Available from ${formatDay(facts.availableFrom)}` : null,
    facts.possessionBy ? `Possession by ${formatMonth(facts.possessionBy)}` : null,
    formatFloor(facts.floor, facts.totalFloors),
  ].filter((v): v is string => Boolean(v))
}

/** A demo fixture's page. */
export function overviewOfProperty(p: PropertyDetail, societyName?: string): OverviewData {
  const name = p.society ?? p.title
  return {
    name,
    place: [societyName && societyName !== name ? societyName : null, p.localityName, p.cityName].filter(Boolean).join(', '),
    intent: p.intent,
    price: p.price,
    rateArea: p.intent === 'buy' ? p.carpetArea : undefined,
    extras: [
      p.deposit != null ? `Deposit ${rupees(p.deposit)}` : null,
      p.maintenanceMonthly != null ? `Maintenance ${rupees(p.maintenanceMonthly)}/mo` : null,
      p.isNegotiable ? 'Negotiable' : null,
    ].filter((v): v is string => Boolean(v)),
    badges: listingBadges(p),
    propertyType: p.propertyType,
    bedrooms: p.propertyType === 'STUDIO' ? undefined : p.bedrooms,
    bathrooms: p.bathrooms,
    carpetArea: p.carpetArea,
    areaUnit: p.areaUnit,
    constructionStatus: p.constructionStatus,
    attributes: attributesOf(p),
    sharePath: propertyPath(p.slug, p.publicId),
    postedAt: p.postedAt,
  }
}

/**
 * Who an enquiry goes to and what it is about — the contact card, bar and
 * sheet (components/enquiry/ContactPanel) take this from either source.
 * The target is a fixture's public id or a real listing's id, never both;
 * the server resolves the seller from it.
 */
export type ContactInfo = {
  seller: { sellerType: SellerType; sellerName?: string; postedAt?: string }
  name: string
  place: string
  intent: Intent
  price: number
  rateArea?: number
  target: { listingPublicId: string; listingId?: undefined } | { listingId: string; listingPublicId?: undefined }
  /** A line under the self-declared note, where the source has more to say. */
  note?: string
}

export function contactOfProperty(p: PropertyDetail): ContactInfo {
  return {
    seller: { sellerType: p.sellerType, sellerName: p.sellerName, postedAt: p.postedAt },
    name: p.society ?? p.title,
    place: `${p.localityName}, ${p.cityName}`,
    intent: p.intent,
    price: p.price,
    rateArea: p.intent === 'buy' ? p.carpetArea : undefined,
    target: { listingPublicId: p.publicId },
  }
}
