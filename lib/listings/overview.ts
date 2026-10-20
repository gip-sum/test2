import type { PreviewModel } from '@/lib/preview/model'
import { listingBadges } from '@/lib/property/badges'
import { attributesOf, type ContactInfo, type OverviewData } from '@/lib/property/overview'

/**
 * A real published listing (Phase 18) in the property page's shapes
 * (UI-16). Only what the seller actually answered is mapped: a real listing
 * has no amenities, landmarks, facing or ownership yet, so those simply do
 * not appear; "maintenance not specified" is left out rather than printed.
 *
 * The heading is the society the seller named, else the listing's title —
 * the demo page's rule, so the two pages read alike.
 */
type Published = PreviewModel & { facts: NonNullable<PreviewModel['facts']>; pricing: NonNullable<PreviewModel['pricing']> }

export function isPublishable(m: PreviewModel): m is Published {
  return Boolean(m.facts && m.pricing && m.entry.type && m.entry.role)
}

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

export function amountOf(m: Published): number {
  return m.pricing.intent === 'buy' ? m.pricing.price : m.pricing.monthlyRent
}

export function nameOf(m: Published): string {
  return m.location?.societyName?.trim() || m.title
}

export function overviewOfListing(m: Published, { postedAt, sharePath }: { postedAt?: string; sharePath?: string }): OverviewData {
  const f = m.facts, p = m.pricing
  const maintenance = p.maintenance.status === 'separate'
    ? `Maintenance ${rupees(p.maintenance.monthly)}/mo`
    : p.maintenance.status === 'none' ? 'No maintenance charge'
      : p.maintenance.status === 'included' ? 'Maintenance included in rent' : null
  return {
    name: nameOf(m),
    place: [m.locality, m.city].filter(Boolean).join(', '),
    intent: p.intent,
    price: amountOf(m),
    rateArea: p.intent === 'buy' ? m.carpetSqft : undefined,
    extras: [p.intent === 'rent' ? `Deposit ${rupees(p.deposit)}` : null, maintenance, p.negotiable ? 'Negotiable' : 'Non-negotiable']
      .filter((v): v is string => Boolean(v)),
    badges: postedAt ? listingBadges({ postedAt, constructionStatus: f.constructionStatus }) : [],
    propertyType: m.entry.type!,
    bedrooms: f.bedrooms,
    bathrooms: f.bathrooms,
    carpetArea: f.carpetArea,
    areaUnit: f.areaUnit,
    constructionStatus: f.constructionStatus,
    attributes: attributesOf({
      furnishing: f.furnishing,
      floor: f.floor,
      totalFloors: f.totalFloors,
      availableNow: f.availableFrom === 'now',
      availableFrom: typeof f.availableFrom === 'object' ? f.availableFrom.from : undefined,
      possessionBy: f.possessionBy,
    }),
    sharePath,
    postedAt,
  }
}

export function contactOfListing(m: Published, listingId: string, postedAt?: string): ContactInfo {
  return {
    seller: { sellerType: m.entry.role!, sellerName: m.sellerName ?? undefined, postedAt },
    name: nameOf(m),
    place: [m.locality, m.city].filter(Boolean).join(', '),
    intent: m.pricing.intent,
    price: amountOf(m),
    rateArea: m.pricing.intent === 'buy' ? m.carpetSqft : undefined,
    target: { listingId },
    note: 'Approval allows publication and does not certify property ownership or accuracy.',
  }
}
