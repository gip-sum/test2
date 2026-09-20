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
