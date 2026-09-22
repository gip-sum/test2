import type { AreaBasis, AreaUnit } from '@/lib/format/area'

export type Intent = 'buy' | 'rent'

export type PropertyTypeCode =
  | 'APARTMENT'
  | 'INDEPENDENT_HOUSE'
  | 'BUILDER_FLOOR'
  | 'VILLA'
  | 'STUDIO'

export type SellerType = 'OWNER' | 'AGENT' | 'BUILDER'

export type Furnishing = 'UNFURNISHED' | 'SEMI_FURNISHED' | 'FURNISHED'

export type ConstructionStatus = 'READY' | 'UNDER_CONSTRUCTION'

/**
 * How the property is owned.
 *
 * Materially affects what a buyer is actually purchasing and how financeable
 * it is, which is why it is a first-class field rather than a line in the
 * description. Power of attorney in particular is a real and consequential
 * category in Kolkata.
 */
export type OwnershipType = 'FREEHOLD' | 'LEASEHOLD' | 'POWER_OF_ATTORNEY'

/** Compass facing. Genuinely load-bearing in Indian property search. */
export type Facing = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

/**
 * Amenities.
 *
 * A closed set, not free text. Free-text amenities cannot be filtered on,
 * cannot be counted, and turn into a hundred spellings of "car parking".
 * The list is deliberately short — only things a buyer filters by.
 */
export type AmenityCode =
  | 'LIFT'
  | 'POWER_BACKUP'
  | 'SECURITY'
  | 'GYM'
  | 'SWIMMING_POOL'
  | 'CLUBHOUSE'
  | 'CHILDRENS_PLAY_AREA'
  | 'GATED_COMMUNITY'
  | 'WATER_SUPPLY_24X7'
  | 'PARK'

export type PropertyMedia = {
  id: string
  /** Null while a listing has no photo — a real and common state. */
  url: string | null
  alt: string
}

export type PropertySummary = {
  id: string
  /** Short, non-sequential public identifier used in URLs. */
  publicId: string
  slug: string
  intent: Intent
  propertyType: PropertyTypeCode
  title: string
  /** Society or project name, when the listing belongs to one. */
  society?: string
  localitySlug: string
  localityName: string
  cityName: string
  /** Integer rupees: sale price, or monthly rent when intent is 'rent'. */
  price: number
  bedrooms: number
  bathrooms: number
  /** Carpet area is required; the other bases are optional but never merged. */
  carpetArea: number
  superArea?: number
  areaUnit: AreaUnit
  areaBasis: AreaBasis
  furnishing: Furnishing
  constructionStatus: ConstructionStatus
  floor?: number
  totalFloors?: number
  sellerType: SellerType
  sellerName?: string
  facing?: Facing
  /** Covered or open parking spaces. 0 is a real, common answer. */
  parkingSpaces: number
  amenities: AmenityCode[]
  /** Years since completion. Absent while under construction. */
  ageYears?: number
  /** ISO date a rental is free from. Absent on sale listings. */
  availableFrom?: string
  /** ISO date. Drives the "Posted N days ago" freshness signal. */
  postedAt: string
  photos: PropertyMedia[]
  isPriceReduced?: boolean
}

export const PROPERTY_TYPE_LABEL: Record<PropertyTypeCode, string> = {
  APARTMENT: 'Flat / Apartment',
  INDEPENDENT_HOUSE: 'Independent house',
  BUILDER_FLOOR: 'Builder floor',
  VILLA: 'Villa',
  STUDIO: 'Studio apartment',
}

/**
 * Plural forms, for headings that count things.
 *
 * A separate map rather than appending "s": "Flat / Apartment" pluralises
 * to "Flats / Apartments", not "Flat / Apartments", and "Independent house"
 * to "Independent houses". No suffix rule gets both right.
 */
export const PROPERTY_TYPE_PLURAL: Record<PropertyTypeCode, string> = {
  APARTMENT: 'Flats / Apartments',
  INDEPENDENT_HOUSE: 'Independent houses',
  BUILDER_FLOOR: 'Builder floors',
  VILLA: 'Villas',
  STUDIO: 'Studio apartments',
}

export const FURNISHING_LABEL: Record<Furnishing, string> = {
  UNFURNISHED: 'Unfurnished',
  SEMI_FURNISHED: 'Semi-furnished',
  FURNISHED: 'Furnished',
}

export const CONSTRUCTION_LABEL: Record<ConstructionStatus, string> = {
  READY: 'Ready to move',
  UNDER_CONSTRUCTION: 'Under construction',
}

export const SELLER_LABEL: Record<SellerType, string> = {
  OWNER: 'Owner',
  AGENT: 'Agent',
  BUILDER: 'Builder',
}

export const OWNERSHIP_LABEL: Record<OwnershipType, string> = {
  FREEHOLD: 'Freehold',
  LEASEHOLD: 'Leasehold',
  POWER_OF_ATTORNEY: 'Power of attorney',
}

export const FACING_LABEL: Record<Facing, string> = {
  N: 'North',
  NE: 'North-East',
  E: 'East',
  SE: 'South-East',
  S: 'South',
  SW: 'South-West',
  W: 'West',
  NW: 'North-West',
}

export const AMENITY_LABEL: Record<AmenityCode, string> = {
  LIFT: 'Lift',
  POWER_BACKUP: 'Power backup',
  SECURITY: 'Security',
  GYM: 'Gym',
  SWIMMING_POOL: 'Swimming pool',
  CLUBHOUSE: 'Clubhouse',
  CHILDRENS_PLAY_AREA: "Children's play area",
  GATED_COMMUNITY: 'Gated community',
  WATER_SUPPLY_24X7: '24x7 water supply',
  PARK: 'Park',
}

/** Stable display order for every facet that lists these. */
export const PROPERTY_TYPE_ORDER: PropertyTypeCode[] = [
  'APARTMENT',
  'INDEPENDENT_HOUSE',
  'BUILDER_FLOOR',
  'VILLA',
  'STUDIO',
]
export const FURNISHING_ORDER: Furnishing[] = ['UNFURNISHED', 'SEMI_FURNISHED', 'FURNISHED']
export const SELLER_ORDER: SellerType[] = ['OWNER', 'AGENT', 'BUILDER']
export const FACING_ORDER: Facing[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
export const AMENITY_ORDER: AmenityCode[] = [
  'LIFT',
  'POWER_BACKUP',
  'SECURITY',
  'GATED_COMMUNITY',
  'WATER_SUPPLY_24X7',
  'PARK',
  'GYM',
  'SWIMMING_POOL',
  'CLUBHOUSE',
  'CHILDRENS_PLAY_AREA',
]

/**
 * Everything the property PAGE needs and a card does not.
 *
 * Deliberately a separate type rather than more optional fields on
 * PropertySummary. A results page holds up to twenty-four summaries and
 * serialises every one of them into the RSC payload; a description of two
 * thousand characters and a dozen media records per card would be paid for
 * on every search, to render none of it.
 *
 * `lib/property/queries.ts` is the only module that produces this.
 */
export type PropertyDetail = PropertySummary & {
  /** Seller prose. Absent on plenty of real listings. */
  description?: string
  /**
   * The three area bases stay three fields, forever. Merging them is the
   * single most damaging content error in Indian property listings —
   * super built-up is routinely 25–35% larger than carpet, so a price per
   * sqft computed against the wrong basis understates the real cost.
   */
  builtUpArea?: number
  balconies?: number
  ownershipType: OwnershipType
  /**
   * Free text, plural. Phase 4 seeds these in the fixture; the posting flow
   * becomes their author later. No coordinates — this is what a seller
   * writes, not a geocode.
   */
  nearbyLandmarks: string[]
  /**
   * FK to a `SOCIETY` location, when the listing belongs to a known one.
   * `society` remains as the display string so a listing in an unlisted
   * building still reads correctly.
   */
  societyLocationId?: string
  /** Rent only: refundable deposit, in integer rupees. */
  deposit?: number
  /** Monthly maintenance, in integer rupees. */
  maintenanceMonthly?: number
  isNegotiable?: boolean
}
