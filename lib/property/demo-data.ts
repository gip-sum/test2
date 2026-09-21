import type {
  AmenityCode,
  ConstructionStatus,
  Facing,
  Furnishing,
  PropertySummary,
  PropertyTypeCode,
  SellerType,
} from './types'

/**
 * ⚠️  DEVELOPMENT DATA — NOT REAL LISTINGS.
 *
 * Seeded inventory so the search experience can be built and judged against
 * realistic content before there is a database. Localities and price ranges
 * are plausible for Kolkata; every property, society, seller and price is
 * invented. Nothing here describes a real home and no one here is a real
 * seller.
 *
 * Phase 2 shipped eight hand-written listings. Search needs more than that:
 * facet counts, pagination, sort and the zero-result path cannot be built
 * — let alone judged — against a corpus small enough that every filter
 * returns everything. So the eight remain, and a generator adds enough
 * around them to make the interface behave the way it will in production.
 *
 * The hand-written eight are the cases that break layouts, kept deliberately:
 *   • a very long title and a long society name
 *   • a ₹3.25 Cr price (the widest realistic price string)
 *   • a listing with NO photo
 *   • rent alongside sale
 *   • a missing floor / total floors
 *
 * Two properties of the generator matter:
 *
 *   DETERMINISTIC. A seeded PRNG, not Math.random, so the corpus is
 *   identical on every build and in every test run. A fixture that
 *   reshuffles itself makes failures unreproducible.
 *
 *   DATED RELATIVE TO TODAY. postedAt is an offset from the current date,
 *   not a hardcoded one, so "posted in the last 24 hours" keeps meaning
 *   what it says instead of quietly emptying out as the fixture ages.
 *
 * Phase 5 replaces this file with the `property` table. Nothing above
 * lib/property/queries.ts imports it.
 */

/** mulberry32 — small, fast, and good enough for fixture spread. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function isoDaysAgo(days: number, now: Date): string {
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function isoDaysAhead(days: number, now: Date): string {
  return isoDaysAgo(-days, now)
}

/**
 * Locality pool.
 *
 * `psf` is an invented but internally consistent per-square-foot anchor, so
 * that a flat in Ballygunge costs more than the same flat in Behala. Without
 * it, price filters would be uncorrelated with place and sorting by price
 * would look random.
 */
const LOCALITIES: Array<{ slug: string; name: string; psf: number; societies: string[] }> = [
  { slug: 'new-town', name: 'New Town', psf: 5600, societies: ['Upohar Luxury Residences', 'Sankalpa Greens', 'Rosedale Garden'] },
  { slug: 'salt-lake', name: 'Salt Lake', psf: 6400, societies: ['Sector V Residency', 'Labony Estate', 'Purbachal Heights'] },
  { slug: 'rajarhat', name: 'Rajarhat', psf: 4900, societies: ['Chinar Park Heights', 'Greenfield Elegance', 'Sunrise Symphony'] },
  { slug: 'ballygunge', name: 'Ballygunge', psf: 13500, societies: ['Ballygunge Park Court', 'Queens Mansion', 'Gurusaday Residency'] },
  { slug: 'tollygunge', name: 'Tollygunge', psf: 7200, societies: ['Tolly Greens', 'Deshapriya Court', 'Netaji Enclave'] },
  { slug: 'behala', name: 'Behala', psf: 4200, societies: ['Sakuntala Apartments', 'Diamond Harbour Residency'] },
  { slug: 'garia', name: 'Garia', psf: 4600, societies: ['Garia Green View', 'Kavi Nazrul Enclave'] },
  { slug: 'jadavpur', name: 'Jadavpur', psf: 6800, societies: ['Jadavpur Central Apartments', 'Sulekha Residency'] },
  { slug: 'e-m-bypass', name: 'E M Bypass', psf: 7600, societies: ['Bypass Greens', 'Ruby Park Residency', 'Avidipta Enclave'] },
  { slug: 'howrah', name: 'Howrah', psf: 3900, societies: ['Shibpur Residency', 'Ganges View Apartments'] },
  { slug: 'dum-dum', name: 'Dum Dum', psf: 4400, societies: ['Nagerbazar Heights', 'Dum Dum Park Enclave'] },
  { slug: 'alipore', name: 'Alipore', psf: 15200, societies: ['Alipore Park Place', 'Belvedere Court'] },
  { slug: 'action-area-i', name: 'Action Area I', psf: 5900, societies: ['Sanjeeva Town', 'Uniworld City'] },
  { slug: 'uttarpara-kotrung', name: 'Uttarpara Kotrung', psf: 3400, societies: ['Kotrung Riverside', 'Uttarpara Garden Estate'] },
]

const AGENCIES = [
  'Basu Properties',
  'Chatterjee Estates',
  'Mitra Realty',
  'Sen & Co. Property',
  'Ganguly Homes',
  'Dutta Property Advisors',
]
const BUILDERS = [
  'Greenfield Developers',
  'Srijan Infrastructure',
  'Bengal Ambuja Housing',
  'Merlin Projects',
]

const TYPES: PropertyTypeCode[] = ['APARTMENT', 'INDEPENDENT_HOUSE', 'BUILDER_FLOOR', 'VILLA', 'STUDIO']
const FURNISHINGS: Furnishing[] = ['UNFURNISHED', 'SEMI_FURNISHED', 'FURNISHED']
const SELLERS: SellerType[] = ['OWNER', 'AGENT', 'BUILDER']
const FACINGS: Facing[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const AMENITIES: AmenityCode[] = [
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

const TYPE_SLUG: Record<PropertyTypeCode, string> = {
  APARTMENT: 'flat',
  INDEPENDENT_HOUSE: 'independent-house',
  BUILDER_FLOOR: 'builder-floor',
  VILLA: 'villa',
  STUDIO: 'studio-apartment',
}

function generate(count: number, now: Date, seed = 20260921): PropertySummary[] {
  const rand = rng(seed)
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!
  const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1))
  const out: PropertySummary[] = []

  for (let i = 0; i < count; i++) {
    const loc = pick(LOCALITIES)
    // Rent is roughly a quarter of inventory, which matches how these
    // marketplaces actually skew.
    const intent = rand() < 0.28 ? 'rent' : 'buy'
    const type = rand() < 0.62 ? 'APARTMENT' : pick(TYPES)
    const bedrooms = type === 'STUDIO' ? 1 : pick([1, 2, 2, 3, 3, 3, 4, 5])
    const bathrooms = Math.max(1, bedrooms - (rand() < 0.45 ? 1 : 0))

    const baseArea = type === 'STUDIO' ? 380 : 280 + bedrooms * 300
    const carpetArea = baseArea + between(-60, 220)
    const superArea = Math.round(carpetArea * (1.22 + rand() * 0.14))

    const construction: ConstructionStatus =
      intent === 'rent' ? 'READY' : rand() < 0.24 ? 'UNDER_CONSTRUCTION' : 'READY'

    // Price is derived from the locality anchor so that sorting and budget
    // filters correlate with place, then rounded the way listings are.
    const psf = loc.psf * (0.86 + rand() * 0.3)
    const sale = Math.round((carpetArea * psf) / 50_000) * 50_000
    const rent = Math.round((carpetArea * (loc.psf / 380) * (0.8 + rand() * 0.5)) / 500) * 500
    const price = intent === 'rent' ? Math.max(6_000, rent) : Math.max(1_500_000, sale)

    const totalFloors = type === 'INDEPENDENT_HOUSE' || type === 'VILLA' ? between(1, 3) : between(4, 22)
    const hasFloor = rand() > 0.12
    const floor = hasFloor ? between(0, totalFloors) : undefined

    const sellerType = pick(SELLERS)
    const sellerName =
      sellerType === 'AGENT' ? pick(AGENCIES) : sellerType === 'BUILDER' ? pick(BUILDERS) : undefined

    const amenityCount = between(0, 7)
    const amenities = AMENITIES.filter(() => rand() < amenityCount / AMENITIES.length)

    const society = type === 'APARTMENT' || type === 'STUDIO' ? pick(loc.societies) : undefined
    const bhk = type === 'STUDIO' ? 'Studio' : `${bedrooms} BHK`
    const postedDaysAgo = Math.floor(rand() ** 2 * 90)

    out.push({
      id: `gen-${i + 1}`,
      publicId: `p_${(seed + i * 7919).toString(36).slice(-6)}`,
      slug: `${type === 'STUDIO' ? 'studio' : `${bedrooms}-bhk`}-${TYPE_SLUG[type]}-for-${intent === 'rent' ? 'rent' : 'sale'}-in-${loc.slug}`,
      intent,
      propertyType: type,
      title: `${bhk} ${type === 'APARTMENT' ? 'flat' : TYPE_SLUG[type].replace(/-/g, ' ')} in ${loc.name}`,
      society,
      localitySlug: loc.slug,
      localityName: loc.name,
      cityName: 'Kolkata',
      price,
      bedrooms,
      bathrooms,
      carpetArea,
      superArea,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: intent === 'rent' ? pick(FURNISHINGS) : rand() < 0.55 ? 'UNFURNISHED' : pick(FURNISHINGS),
      constructionStatus: construction,
      floor,
      totalFloors,
      sellerType,
      sellerName,
      facing: rand() < 0.85 ? pick(FACINGS) : undefined,
      parkingSpaces: rand() < 0.3 ? 0 : between(1, 2),
      amenities,
      ageYears: construction === 'READY' ? between(0, 18) : undefined,
      availableFrom: intent === 'rent' ? isoDaysAhead(between(0, 45), now) : undefined,
      postedAt: isoDaysAgo(postedDaysAgo, now),
      // About one listing in six has no photo yet. That is a real state and
      // the grid must not look broken when it happens.
      photos: rand() < 0.17 ? [] : [{ id: `m-${i}`, url: null, alt: `${bhk} in ${loc.name}, Kolkata` }],
      isPriceReduced: intent === 'buy' && rand() < 0.12,
    })
  }
  return out
}

/** The hand-written edge cases. These are load-bearing for layout testing. */
function handWritten(now: Date): PropertySummary[] {
  return [
    {
      id: 'demo-1',
      publicId: 'p_8f3c2a',
      slug: '3-bhk-flat-for-sale-in-new-town',
      intent: 'buy',
      propertyType: 'APARTMENT',
      title: '3 BHK flat with open balcony',
      society: 'Upohar Luxury Residences',
      localitySlug: 'new-town',
      localityName: 'New Town',
      cityName: 'Kolkata',
      price: 6250000,
      bedrooms: 3,
      bathrooms: 3,
      carpetArea: 1240,
      superArea: 1580,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'SEMI_FURNISHED',
      constructionStatus: 'READY',
      floor: 7,
      totalFloors: 14,
      sellerType: 'OWNER',
      facing: 'S',
      parkingSpaces: 1,
      amenities: ['LIFT', 'POWER_BACKUP', 'SECURITY', 'PARK'],
      ageYears: 4,
      postedAt: isoDaysAgo(4, now),
      photos: [{ id: 'm1', url: null, alt: '3 BHK flat in New Town, Kolkata' }],
    },
    {
      id: 'demo-2',
      publicId: 'p_2b91de',
      slug: '2-bhk-flat-for-rent-in-salt-lake',
      intent: 'rent',
      propertyType: 'APARTMENT',
      title: '2 BHK near the IT corridor',
      society: 'Sector V Residency',
      localitySlug: 'salt-lake',
      localityName: 'Salt Lake',
      cityName: 'Kolkata',
      price: 22000,
      bedrooms: 2,
      bathrooms: 2,
      carpetArea: 940,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'FURNISHED',
      constructionStatus: 'READY',
      floor: 4,
      totalFloors: 9,
      sellerType: 'AGENT',
      sellerName: 'Basu Properties',
      facing: 'E',
      parkingSpaces: 1,
      amenities: ['LIFT', 'POWER_BACKUP', 'SECURITY', 'GYM'],
      ageYears: 6,
      availableFrom: isoDaysAhead(10, now),
      postedAt: isoDaysAgo(1, now),
      photos: [{ id: 'm2', url: null, alt: '2 BHK flat in Salt Lake, Kolkata' }],
    },
    {
      // The widest realistic price string, and the longest society name.
      id: 'demo-3',
      publicId: 'p_5d40ab',
      slug: '4-bhk-flat-for-sale-in-ballygunge',
      intent: 'buy',
      propertyType: 'APARTMENT',
      title: 'Spacious 4 BHK apartment with a south-facing balcony and covered parking for two cars',
      society: 'Ballygunge Park Court Residency Phase II',
      localitySlug: 'ballygunge',
      localityName: 'Ballygunge',
      cityName: 'Kolkata',
      price: 32500000,
      bedrooms: 4,
      bathrooms: 4,
      carpetArea: 2340,
      superArea: 2980,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'UNFURNISHED',
      constructionStatus: 'READY',
      floor: 3,
      totalFloors: 6,
      sellerType: 'AGENT',
      sellerName: 'Chatterjee Estates',
      facing: 'S',
      parkingSpaces: 2,
      amenities: ['LIFT', 'POWER_BACKUP', 'SECURITY', 'GATED_COMMUNITY', 'CLUBHOUSE', 'PARK'],
      ageYears: 9,
      postedAt: isoDaysAgo(8, now),
      photos: [{ id: 'm3', url: null, alt: '4 BHK apartment in Ballygunge, Kolkata' }],
      isPriceReduced: true,
    },
    {
      // No photo, and no floor information. Both are common and neither may
      // make the card look broken.
      id: 'demo-4',
      publicId: 'p_9c17f4',
      slug: '2-bhk-builder-floor-for-sale-in-behala',
      intent: 'buy',
      propertyType: 'BUILDER_FLOOR',
      title: '2 BHK builder floor near the metro',
      localitySlug: 'behala',
      localityName: 'Behala',
      cityName: 'Kolkata',
      price: 3200000,
      bedrooms: 2,
      bathrooms: 2,
      carpetArea: 760,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'UNFURNISHED',
      constructionStatus: 'READY',
      sellerType: 'OWNER',
      facing: 'N',
      parkingSpaces: 0,
      amenities: [],
      ageYears: 12,
      postedAt: isoDaysAgo(9, now),
      photos: [],
    },
    {
      id: 'demo-5',
      publicId: 'p_63ea08',
      slug: '3-bhk-flat-for-rent-in-e-m-bypass',
      intent: 'rent',
      propertyType: 'APARTMENT',
      title: '3 BHK with balcony overlooking the lake',
      society: 'Bypass Greens',
      localitySlug: 'e-m-bypass',
      localityName: 'E M Bypass',
      cityName: 'Kolkata',
      price: 45000,
      bedrooms: 3,
      bathrooms: 3,
      carpetArea: 1460,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'SEMI_FURNISHED',
      constructionStatus: 'READY',
      floor: 11,
      totalFloors: 18,
      sellerType: 'OWNER',
      facing: 'W',
      parkingSpaces: 1,
      amenities: ['LIFT', 'POWER_BACKUP', 'SECURITY', 'SWIMMING_POOL', 'GYM', 'CLUBHOUSE'],
      ageYears: 3,
      availableFrom: isoDaysAhead(3, now),
      postedAt: isoDaysAgo(7, now),
      photos: [{ id: 'm5', url: null, alt: '3 BHK flat on E M Bypass, Kolkata' }],
    },
    {
      id: 'demo-6',
      publicId: 'p_41bb7c',
      slug: '3-bhk-flat-for-sale-in-rajarhat',
      intent: 'buy',
      propertyType: 'APARTMENT',
      title: '3 BHK in a gated complex',
      society: 'Chinar Park Heights',
      localitySlug: 'rajarhat',
      localityName: 'Rajarhat',
      cityName: 'Kolkata',
      price: 8400000,
      bedrooms: 3,
      bathrooms: 2,
      carpetArea: 1310,
      superArea: 1680,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'UNFURNISHED',
      constructionStatus: 'UNDER_CONSTRUCTION',
      floor: 9,
      totalFloors: 16,
      sellerType: 'BUILDER',
      sellerName: 'Greenfield Developers',
      facing: 'NE',
      parkingSpaces: 1,
      amenities: ['LIFT', 'POWER_BACKUP', 'SECURITY', 'GATED_COMMUNITY', 'CHILDRENS_PLAY_AREA'],
      postedAt: isoDaysAgo(11, now),
      photos: [{ id: 'm6', url: null, alt: '3 BHK flat in Rajarhat, Kolkata' }],
    },
    {
      id: 'demo-7',
      publicId: 'p_7a2f55',
      slug: 'studio-apartment-for-rent-in-new-town',
      intent: 'rent',
      propertyType: 'STUDIO',
      title: 'Studio apartment, fully furnished',
      localitySlug: 'new-town',
      localityName: 'New Town',
      cityName: 'Kolkata',
      price: 14500,
      bedrooms: 1,
      bathrooms: 1,
      carpetArea: 410,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'FURNISHED',
      constructionStatus: 'READY',
      floor: 6,
      totalFloors: 12,
      sellerType: 'AGENT',
      sellerName: 'Mitra Realty',
      facing: 'SE',
      parkingSpaces: 0,
      amenities: ['LIFT', 'SECURITY', 'POWER_BACKUP'],
      ageYears: 2,
      availableFrom: isoDaysAhead(0, now),
      postedAt: isoDaysAgo(2, now),
      photos: [{ id: 'm7', url: null, alt: 'Studio apartment in New Town, Kolkata' }],
    },
    {
      id: 'demo-8',
      publicId: 'p_0e88d1',
      slug: '4-bhk-independent-house-for-sale-in-tollygunge',
      intent: 'buy',
      propertyType: 'INDEPENDENT_HOUSE',
      title: '4 BHK independent house with a garden',
      localitySlug: 'tollygunge',
      localityName: 'Tollygunge',
      cityName: 'Kolkata',
      price: 15800000,
      bedrooms: 4,
      bathrooms: 3,
      carpetArea: 2100,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'UNFURNISHED',
      constructionStatus: 'READY',
      floor: 1,
      totalFloors: 2,
      sellerType: 'OWNER',
      facing: 'S',
      parkingSpaces: 2,
      amenities: ['PARK', 'SECURITY'],
      ageYears: 15,
      postedAt: isoDaysAgo(13, now),
      photos: [{ id: 'm8', url: null, alt: '4 BHK independent house in Tollygunge, Kolkata' }],
    },
  ]
}

/**
 * Builds the corpus. Exported so tests can pin `now` and get a fixture that
 * does not drift with the clock.
 */
export function buildDemoProperties(now: Date = new Date(), count = 76): PropertySummary[] {
  return [...handWritten(now), ...generate(count, now)]
}

export const DEMO_PROPERTIES: PropertySummary[] = buildDemoProperties()
