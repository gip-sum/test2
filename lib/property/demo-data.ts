import type {
  AmenityCode,
  ConstructionStatus,
  Facing,
  Furnishing,
  OwnershipType,
  PropertyDetail,
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

/** Mirrors the slug rule used to seed SOCIETY locations in the gazetteer. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
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
  { slug: 'em-bypass', name: 'E M Bypass', psf: 7600, societies: ['Bypass Greens', 'Ruby Park Residency', 'Avidipta Enclave'] },
  { slug: 'howrah', name: 'Howrah', psf: 3900, societies: ['Shibpur Residency', 'Ganges View Apartments'] },
  { slug: 'dum-dum', name: 'Dum Dum', psf: 4400, societies: ['Nagerbazar Heights', 'Dum Dum Park Enclave'] },
  { slug: 'alipore', name: 'Alipore', psf: 15200, societies: ['Alipore Park Place', 'Belvedere Court'] },
  { slug: 'new-town-action-area-i', name: 'Action Area I', psf: 5900, societies: ['Sanjeeva Town', 'Uniworld City'] },
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

/**
 * The development image catalogue.
 *
 * Generated by scripts/generate-dev-media.py because this environment has
 * no outbound network access. They are flat illustrations, never
 * photographs, and each carries a baked-in SAMPLE tag so an image served
 * on its own still says what it is.
 */
const SCENES = ['living', 'bedroom', 'kitchen', 'balcony', 'bathroom', 'exterior', 'study', 'hall'] as const
const TONES = ['cool', 'warm', 'green'] as const
const SCENE_LABEL: Record<(typeof SCENES)[number], string> = {
  living: 'Living room',
  bedroom: 'Bedroom',
  kitchen: 'Kitchen',
  balcony: 'Balcony',
  bathroom: 'Bathroom',
  exterior: 'Building exterior',
  study: 'Study',
  hall: 'Entrance hall',
}

/** Real Kolkata landmarks, used as the kind of text a seller would write. */
const LANDMARKS: Record<string, string[]> = {
  'new-town': ['Eco Park', 'Biswa Bangla Gate', 'DLF IT Park', 'New Town Bus Terminus'],
  'salt-lake': ['City Centre 1', 'Sector V IT hub', 'Salt Lake Stadium', 'Karunamoyee crossing'],
  rajarhat: ['Chinar Park', 'Axis Mall', 'Rajarhat Road', 'Narkelbagan crossing'],
  ballygunge: ['Ballygunge Phari', 'Quest Mall', 'Gurusaday Road', 'Ballygunge railway station'],
  tollygunge: ['Tollygunge Metro', 'Rabindra Sarobar', 'Deshapriya Park', 'Tollygunge Club'],
  behala: ['Behala Chowrasta', 'Diamond Harbour Road', 'Behala Tram Depot', 'Sakher Bazar'],
  garia: ['Garia Metro', 'Kavi Nazrul Metro', 'Garia Bazar', 'Baghajatin station'],
  jadavpur: ['Jadavpur University', 'Jadavpur station', 'Sulekha crossing', '8B Bus Stand'],
  'em-bypass': ['Ruby Hospital', 'Science City', 'Metropolis Mall', 'Chingrighata crossing'],
  howrah: ['Howrah station', 'Shibpur Botanical Garden', 'Howrah Maidan Metro', 'Shalimar station'],
  'dum-dum': ['Dum Dum Metro', 'Nagerbazar crossing', 'Airport Gate 1', 'Dum Dum Junction'],
  alipore: ['Alipore Zoo', 'National Library', 'Belvedere Road', 'Alipore Court'],
  'new-town-action-area-i': ['Eco Park Gate 1', 'Tata Medical Centre', 'Uniworld City', 'Action Area I bus stop'],
  'uttarpara-kotrung': ['Uttarpara station', 'GT Road', 'Hindmotor station', 'Uttarpara Jaykrishna Library'],
}

const OWNERSHIPS: OwnershipType[] = ['FREEHOLD', 'FREEHOLD', 'FREEHOLD', 'LEASEHOLD', 'POWER_OF_ATTORNEY']

/** Prose in the register a seller actually writes. */
const DESCRIPTIONS = [
  'Well-maintained flat in a quiet pocket, walking distance from the main road. The building has a lift and round-the-clock security. Morning sun in the living room and both bedrooms. Water supply is regular and there has never been a shortage. Ready for immediate possession.',
  'South-facing flat on a higher floor with an open view and good cross ventilation. Recently painted. Modular kitchen with a chimney and piped gas. Covered parking included. The society is gated with a maintained park for children.',
  'Spacious layout with a separate dining area. The block is set back from the main road so it stays quiet. Close to schools, a daily market and the metro. Maintenance is modest for the facilities offered. Genuine buyers only.',
  'Corner unit with windows on two sides. Balcony off the living room looks onto the garden rather than the road. Lift, power backup for common areas and a lift-attended lobby. Registration and handover can be completed quickly.',
]

/**
 * The long one. Kept deliberately verbose because a two-thousand-character
 * description is the layout case that actually breaks a property page, and
 * it has to exist in the fixture for the clamp and expand to be testable.
 */
const LONG_DESCRIPTION = [
  'This is a genuinely spacious apartment in one of the better-maintained complexes in the area, and it has been looked after carefully since possession.',
  'The layout gives you a large living and dining space that opens onto a balcony running the width of the flat, which means the main room gets light through most of the day rather than only in the morning.',
  'All bedrooms are proper double rooms with built-in wardrobes, and the master has an attached bathroom with a separate shower area.',
  'The kitchen is fully modular with a chimney, hob, water purifier point and a utility balcony behind it for washing and drying, so the machine is not sitting in the bathroom as it is in many flats of this size.',
  'Flooring is vitrified tile throughout with anti-skid tile in the bathrooms and balconies.',
  'Electrical work has been redone with sufficient points in every room, including dedicated points for air conditioners in all bedrooms and the living room.',
  'The complex has a lift with power backup, a generator for common areas, CCTV at the entry and exit, a manned gate, visitor parking, a small gym, a community hall that residents can book, and a landscaped area with a play space for children.',
  'Maintenance covers security, housekeeping of common areas, lift and generator servicing, and the water pump.',
  'Water supply is from both corporation supply and a deep tube well, so there is no shortage even in summer.',
  'The building is around eight years old and has had no structural issues; the exterior was repainted two years ago and the terrace waterproofing was redone at the same time.',
  'Connectivity is straightforward: the main road is a five minute walk, autos and buses are available throughout the day, and the metro is a short ride away.',
  'There is a daily market, two chemists, a bank branch and an ATM within a few hundred metres, and several well-regarded schools within two kilometres.',
  'The flat is available with clear title and all society dues paid up to date.',
  'Documentation is in order and the seller can complete registration without delay.',
  'Site visits are welcome on weekdays and weekends with a little notice.',
].join(' ')

const TYPE_SLUG: Record<PropertyTypeCode, string> = {
  APARTMENT: 'flat',
  INDEPENDENT_HOUSE: 'independent-house',
  BUILDER_FLOOR: 'builder-floor',
  VILLA: 'villa',
  STUDIO: 'studio-apartment',
}

function generate(count: number, now: Date, seed = 20260921): PropertyDetail[] {
  const rand = rng(seed)
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!
  const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1))
  const out: PropertyDetail[] = []

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
      // About one listing in six has no photo at all. That is a real state
      // and neither the grid nor the gallery may look broken when it happens.
      // The rest get between one and eight, so the gallery's single-image
      // path and its many-image path are both reachable in the fixture.
      photos: (() => {
        if (rand() < 0.17) return []
        const tone = TONES[Math.floor(rand() * TONES.length)]!
        const n = 1 + Math.floor(rand() * 8)
        return SCENES.slice(0, n).map((scene, k) => ({
          id: `m-${i}-${k}`,
          url: `/dev-media/${scene}-${tone}.png`,
          alt: `${SCENE_LABEL[scene]} — ${bhk} in ${loc.name}, Kolkata (sample image)`,
          isSample: true,
        }))
      })(),
      isPriceReduced: intent === 'buy' && rand() < 0.12,

      // ---- detail-only fields ----
      description: rand() < 0.12 ? undefined : DESCRIPTIONS[Math.floor(rand() * DESCRIPTIONS.length)]!,
      builtUpArea: rand() < 0.2 ? undefined : Math.round(carpetArea * (1.1 + rand() * 0.08)),
      balconies: rand() < 0.15 ? undefined : between(0, 3),
      ownershipType: OWNERSHIPS[Math.floor(rand() * OWNERSHIPS.length)]!,
      nearbyLandmarks: (LANDMARKS[loc.slug] ?? []).slice(0, between(0, 4)),
      societyLocationId: society ? `loc_${loc.slug}-${slugify(society)}` : undefined,
      deposit: intent === 'rent' ? Math.round((price * (1 + rand() * 2)) / 5_000) * 5_000 : undefined,
      maintenanceMonthly: rand() < 0.35 ? undefined : Math.round((carpetArea * (1.2 + rand())) / 100) * 100,
      isNegotiable: rand() < 0.4,
    })
  }
  return out
}

/**
 * The hand-written listings. Load-bearing for layout and state testing.
 *
 * Each exists to make one awkward case reachable: no photo, exactly one
 * photo, the maximum number of photos, no description, a two-thousand
 * character description, the widest price string, carpet area only, no
 * society, and a locality thin enough that similar properties cannot reach
 * four and the section must disappear.
 */
function handWritten(now: Date): PropertyDetail[] {
  const shot = (scene: (typeof SCENES)[number], tone: (typeof TONES)[number], what: string) => ({
    id: `m-${scene}-${tone}`,
    url: `/dev-media/${scene}-${tone}.png`,
    alt: `${SCENE_LABEL[scene]} — ${what} (sample image)`,
    isSample: true,
  })
  /** Twelve shots, which needs two tones: there are only eight scenes. */
  const many = (what: string) => [
    ...SCENES.map((s) => shot(s, 'warm', what)),
    ...SCENES.slice(0, 4).map((s) => shot(s, 'cool', what)),
  ]

  return [
    {
      id: 'demo-1',
      publicId: 'p_8f3c2a',
      slug: '3-bhk-flat-for-sale-in-new-town',
      intent: 'buy',
      propertyType: 'APARTMENT',
      title: '3 BHK flat with open balcony',
      society: 'Upohar Luxury Residences',
      societyLocationId: 'loc_new-town-upohar-luxury-residences',
      localitySlug: 'new-town',
      localityName: 'New Town',
      cityName: 'Kolkata',
      price: 6250000,
      bedrooms: 3,
      bathrooms: 3,
      carpetArea: 1240,
      builtUpArea: 1380,
      superArea: 1580,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'SEMI_FURNISHED',
      constructionStatus: 'READY',
      floor: 7,
      totalFloors: 14,
      balconies: 2,
      ownershipType: 'FREEHOLD',
      sellerType: 'OWNER',
      facing: 'S',
      parkingSpaces: 1,
      amenities: ['LIFT', 'POWER_BACKUP', 'SECURITY', 'PARK'],
      ageYears: 4,
      nearbyLandmarks: ['Eco Park', 'Biswa Bangla Gate', 'DLF IT Park'],
      description: DESCRIPTIONS[0]!,
      maintenanceMonthly: 2400,
      isNegotiable: true,
      postedAt: isoDaysAgo(4, now),
      photos: SCENES.slice(0, 6).map((s) => shot(s, 'cool', '3 BHK flat in New Town')),
    },
    {
      // Exactly ONE photo: the gallery must drop its strip and its counter.
      id: 'demo-2',
      publicId: 'p_2b91de',
      slug: '2-bhk-flat-for-rent-in-salt-lake',
      intent: 'rent',
      propertyType: 'APARTMENT',
      title: '2 BHK near the IT corridor',
      society: 'Sector V Residency',
      societyLocationId: 'loc_salt-lake-sector-v-residency',
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
      balconies: 1,
      ownershipType: 'FREEHOLD',
      sellerType: 'AGENT',
      sellerName: 'Basu Properties',
      facing: 'E',
      parkingSpaces: 1,
      amenities: ['LIFT', 'POWER_BACKUP', 'SECURITY', 'GYM'],
      ageYears: 6,
      nearbyLandmarks: ['Sector V IT hub', 'City Centre 1'],
      description: DESCRIPTIONS[1]!,
      deposit: 66000,
      maintenanceMonthly: 1800,
      isNegotiable: false,
      availableFrom: isoDaysAhead(10, now),
      postedAt: isoDaysAgo(1, now),
      photos: [shot('living', 'warm', '2 BHK flat in Salt Lake')],
    },
    {
      // The widest price string, the longest society name, the longest
      // description and the maximum photo count, all on one listing.
      id: 'demo-3',
      publicId: 'p_5d40ab',
      slug: '4-bhk-flat-for-sale-in-ballygunge',
      intent: 'buy',
      propertyType: 'APARTMENT',
      title: 'Spacious 4 BHK apartment with a south-facing balcony and covered parking for two cars',
      society: 'Ballygunge Park Court Residency Phase II',
      societyLocationId: 'loc_ballygunge-ballygunge-park-court',
      localitySlug: 'ballygunge',
      localityName: 'Ballygunge',
      cityName: 'Kolkata',
      price: 32500000,
      bedrooms: 4,
      bathrooms: 4,
      carpetArea: 2340,
      builtUpArea: 2610,
      superArea: 2980,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'UNFURNISHED',
      constructionStatus: 'READY',
      floor: 3,
      totalFloors: 6,
      balconies: 3,
      ownershipType: 'FREEHOLD',
      sellerType: 'AGENT',
      sellerName: 'Chatterjee Estates',
      facing: 'S',
      parkingSpaces: 2,
      amenities: ['LIFT', 'POWER_BACKUP', 'SECURITY', 'GATED_COMMUNITY', 'CLUBHOUSE', 'PARK'],
      ageYears: 9,
      nearbyLandmarks: ['Ballygunge Phari', 'Quest Mall', 'Gurusaday Road', 'Ballygunge railway station'],
      description: LONG_DESCRIPTION,
      maintenanceMonthly: 9500,
      isNegotiable: true,
      postedAt: isoDaysAgo(8, now),
      photos: many('4 BHK apartment in Ballygunge'),
      isPriceReduced: true,
    },
    {
      // No photo, no description, no society, no floor, carpet area only,
      // and a power-of-attorney title. Nothing here may look broken.
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
      ownershipType: 'POWER_OF_ATTORNEY',
      sellerType: 'OWNER',
      facing: 'N',
      parkingSpaces: 0,
      amenities: [],
      ageYears: 12,
      nearbyLandmarks: [],
      postedAt: isoDaysAgo(9, now),
      photos: [],
    },
    {
      id: 'demo-5',
      publicId: 'p_63ea08',
      slug: '3-bhk-flat-for-rent-in-em-bypass',
      intent: 'rent',
      propertyType: 'APARTMENT',
      title: '3 BHK with balcony overlooking the lake',
      society: 'Bypass Greens',
      societyLocationId: 'loc_em-bypass-bypass-greens',
      localitySlug: 'em-bypass',
      localityName: 'E M Bypass',
      cityName: 'Kolkata',
      price: 45000,
      bedrooms: 3,
      bathrooms: 3,
      carpetArea: 1460,
      builtUpArea: 1620,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'SEMI_FURNISHED',
      constructionStatus: 'READY',
      floor: 11,
      totalFloors: 18,
      balconies: 2,
      ownershipType: 'FREEHOLD',
      sellerType: 'OWNER',
      facing: 'W',
      parkingSpaces: 1,
      amenities: ['LIFT', 'POWER_BACKUP', 'SECURITY', 'SWIMMING_POOL', 'GYM', 'CLUBHOUSE'],
      ageYears: 3,
      nearbyLandmarks: ['Ruby Hospital', 'Science City', 'Metropolis Mall'],
      description: DESCRIPTIONS[2]!,
      deposit: 135000,
      maintenanceMonthly: 3200,
      isNegotiable: true,
      availableFrom: isoDaysAhead(3, now),
      postedAt: isoDaysAgo(7, now),
      photos: SCENES.slice(0, 5).map((s) => shot(s, 'green', '3 BHK flat on E M Bypass')),
    },
    {
      // Under construction: no age, a possession date instead.
      id: 'demo-6',
      publicId: 'p_41bb7c',
      slug: '3-bhk-flat-for-sale-in-rajarhat',
      intent: 'buy',
      propertyType: 'APARTMENT',
      title: '3 BHK in a gated complex',
      society: 'Chinar Park Heights',
      societyLocationId: 'loc_rajarhat-chinar-park-heights',
      localitySlug: 'rajarhat',
      localityName: 'Rajarhat',
      cityName: 'Kolkata',
      price: 8400000,
      bedrooms: 3,
      bathrooms: 2,
      carpetArea: 1310,
      builtUpArea: 1450,
      superArea: 1680,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'UNFURNISHED',
      constructionStatus: 'UNDER_CONSTRUCTION',
      floor: 9,
      totalFloors: 16,
      balconies: 2,
      ownershipType: 'FREEHOLD',
      sellerType: 'BUILDER',
      sellerName: 'Greenfield Developers',
      facing: 'NE',
      parkingSpaces: 1,
      amenities: ['LIFT', 'POWER_BACKUP', 'SECURITY', 'GATED_COMMUNITY', 'CHILDRENS_PLAY_AREA'],
      nearbyLandmarks: ['Chinar Park', 'Axis Mall'],
      description: DESCRIPTIONS[3]!,
      maintenanceMonthly: 2800,
      isNegotiable: false,
      postedAt: isoDaysAgo(11, now),
      photos: SCENES.slice(0, 4).map((s) => shot(s, 'warm', '3 BHK flat in Rajarhat')),
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
      balconies: 1,
      ownershipType: 'FREEHOLD',
      sellerType: 'AGENT',
      sellerName: 'Mitra Realty',
      facing: 'SE',
      parkingSpaces: 0,
      amenities: ['LIFT', 'SECURITY', 'POWER_BACKUP'],
      ageYears: 2,
      nearbyLandmarks: ['Eco Park', 'New Town Bus Terminus'],
      description: DESCRIPTIONS[1]!,
      deposit: 43500,
      availableFrom: isoDaysAhead(0, now),
      postedAt: isoDaysAgo(2, now),
      photos: [shot('living', 'green', 'Studio apartment in New Town'), shot('bathroom', 'green', 'Studio apartment in New Town')],
    },
    {
      // No society, because an independent house has none.
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
      builtUpArea: 2320,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'UNFURNISHED',
      constructionStatus: 'READY',
      floor: 1,
      totalFloors: 2,
      balconies: 2,
      ownershipType: 'LEASEHOLD',
      sellerType: 'OWNER',
      facing: 'S',
      parkingSpaces: 2,
      amenities: ['PARK', 'SECURITY'],
      ageYears: 15,
      nearbyLandmarks: ['Tollygunge Metro', 'Rabindra Sarobar'],
      description: DESCRIPTIONS[0]!,
      isNegotiable: true,
      postedAt: isoDaysAgo(13, now),
      photos: SCENES.slice(0, 3).map((s) => shot(s, 'warm', '4 BHK independent house in Tollygunge')),
    },
    {
      // Howrah is the thinnest locality in the fixture, and a 5 BHK there
      // has no peers. This is the listing that makes the "fewer than four
      // similar, so omit the section" path reachable.
      id: 'demo-9',
      publicId: 'p_b4c0d2',
      slug: '5-bhk-independent-house-for-sale-in-howrah',
      intent: 'buy',
      propertyType: 'INDEPENDENT_HOUSE',
      title: '5 BHK house on a corner plot',
      localitySlug: 'howrah',
      localityName: 'Howrah',
      cityName: 'Kolkata',
      price: 12500000,
      bedrooms: 5,
      bathrooms: 4,
      carpetArea: 2650,
      areaUnit: 'sqft',
      areaBasis: 'carpet',
      furnishing: 'UNFURNISHED',
      constructionStatus: 'READY',
      floor: 2,
      totalFloors: 3,
      balconies: 3,
      ownershipType: 'FREEHOLD',
      sellerType: 'OWNER',
      facing: 'NW',
      parkingSpaces: 2,
      amenities: ['SECURITY'],
      ageYears: 22,
      nearbyLandmarks: ['Howrah station', 'Shibpur Botanical Garden'],
      description: DESCRIPTIONS[2]!,
      isNegotiable: true,
      postedAt: isoDaysAgo(16, now),
      photos: SCENES.slice(0, 2).map((s) => shot(s, 'cool', '5 BHK house in Howrah')),
    },
  ]
}

/**
 * Builds the corpus. Exported so tests can pin `now` and get a fixture that
 * does not drift with the clock.
 */
export function buildDemoProperties(now: Date = new Date(), count = 76): PropertyDetail[] {
  return [...handWritten(now), ...generate(count, now)]
}

export const DEMO_PROPERTIES: PropertyDetail[] = buildDemoProperties()

/**
 * The same corpus projected down to what a CARD needs.
 *
 * Search and listing functions read this, not DEMO_PROPERTIES. A results
 * page holds twenty-four rows and serialises every one into the RSC
 * payload; shipping a two-thousand-character description and eight media
 * records per row would be paid for on every search to render none of it.
 * The projection is what keeps PropertySummary's promise honest at runtime,
 * not just in the type.
 */
export function toSummary(p: PropertyDetail): PropertySummary {
  // Picked explicitly rather than destructured-and-spread. Both express
  // "drop the heavy fields", but only this one is checked: if a required
  // PropertySummary field is ever added, TypeScript fails here. The
  // omit-by-rest form would silently let a new DETAIL field leak into
  // every search payload instead.
  return {
    id: p.id,
    publicId: p.publicId,
    slug: p.slug,
    intent: p.intent,
    propertyType: p.propertyType,
    title: p.title,
    society: p.society,
    localitySlug: p.localitySlug,
    localityName: p.localityName,
    cityName: p.cityName,
    price: p.price,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    carpetArea: p.carpetArea,
    superArea: p.superArea,
    areaUnit: p.areaUnit,
    areaBasis: p.areaBasis,
    furnishing: p.furnishing,
    constructionStatus: p.constructionStatus,
    floor: p.floor,
    totalFloors: p.totalFloors,
    sellerType: p.sellerType,
    sellerName: p.sellerName,
    facing: p.facing,
    parkingSpaces: p.parkingSpaces,
    amenities: p.amenities,
    ageYears: p.ageYears,
    availableFrom: p.availableFrom,
    postedAt: p.postedAt,
    isPriceReduced: p.isPriceReduced,
    // Cards render one cover image; the rest of the gallery is the page's.
    photos: p.photos.slice(0, 1),
  }
}

export const DEMO_SUMMARIES: PropertySummary[] = DEMO_PROPERTIES.map(toSummary)
