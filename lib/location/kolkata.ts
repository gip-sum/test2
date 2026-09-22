import type { Location } from './types'

/**
 * Kolkata place tree.
 *
 * These are real geographic names, not invented data — the tree mirrors how
 * people in Kolkata actually describe where they live. In V0 it is a static
 * fixture; Phase 5 moves it to the `location` table with the same shape, so
 * nothing above `lib/location/queries.ts` changes.
 */
const L = (
  slug: string,
  name: string,
  type: Location['type'],
  parentSlug: string | null,
  displayPath: string,
  aliases?: string[],
): Location => ({ id: `loc_${slug}`, slug, name, type, parentSlug, displayPath, aliases })

/**
 * Society shorthand.
 *
 * A society is a place, not a property attribute. Modelling it in the
 * gazetteer is what lets a listing point at a real row instead of repeating
 * a display string, and it is what stops the same building arriving as
 * forty spellings once sellers type it themselves. `PHASE-0-PLAN §9`
 * anticipated exactly this: it gives the product a project-adjacent feel
 * for the cost of one enum value, with no Project entity until Phase 44.
 */
const S = (slug: string, name: string, parentSlug: string, displayPath: string): Location =>
  L(slug, name, 'SOCIETY', parentSlug, displayPath)

export const KOLKATA_LOCATIONS: Location[] = [
  L('kolkata', 'Kolkata', 'CITY', null, 'West Bengal'),

  // North-east / Rajarhat corridor
  L('new-town', 'New Town', 'LOCALITY', 'kolkata', 'Kolkata', ['newtown', 'rajarhat new town']),
  L('new-town-action-area-i', 'Action Area I', 'SUB_LOCALITY', 'new-town', 'New Town, Kolkata'),
  L('new-town-action-area-ii', 'Action Area II', 'SUB_LOCALITY', 'new-town', 'New Town, Kolkata'),
  L('new-town-action-area-iii', 'Action Area III', 'SUB_LOCALITY', 'new-town', 'New Town, Kolkata'),
  L('rajarhat', 'Rajarhat', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('chinar-park', 'Chinar Park', 'SUB_LOCALITY', 'rajarhat', 'Rajarhat, Kolkata'),
  L('salt-lake', 'Salt Lake', 'LOCALITY', 'kolkata', 'Kolkata', ['bidhannagar', 'salt lake city']),
  L('salt-lake-sector-v', 'Sector V', 'SUB_LOCALITY', 'salt-lake', 'Salt Lake, Kolkata'),
  L('salt-lake-sector-ii', 'Sector II', 'SUB_LOCALITY', 'salt-lake', 'Salt Lake, Kolkata'),
  L('baguiati', 'Baguiati', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('kestopur', 'Kestopur', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('lake-town', 'Lake Town', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('dum-dum', 'Dum Dum', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('madhyamgram', 'Madhyamgram', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('barasat', 'Barasat', 'LOCALITY', 'kolkata', 'Kolkata'),

  // South
  L('ballygunge', 'Ballygunge', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('tollygunge', 'Tollygunge', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('jadavpur', 'Jadavpur', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('garia', 'Garia', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('behala', 'Behala', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('alipore', 'Alipore', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('bhowanipore', 'Bhowanipore', 'LOCALITY', 'kolkata', 'Kolkata', ['bhawanipur']),
  L('kasba', 'Kasba', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('santoshpur', 'Santoshpur', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('narendrapur', 'Narendrapur', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('sonarpur', 'Sonarpur', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('joka', 'Joka', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('thakurpukur', 'Thakurpukur', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('em-bypass', 'E M Bypass', 'LOCALITY', 'kolkata', 'Kolkata', ['eastern metropolitan bypass']),

  // Central / north
  L('park-street', 'Park Street', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('maniktala', 'Maniktala', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('shyambazar', 'Shyambazar', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('ultadanga', 'Ultadanga', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('beliaghata', 'Beliaghata', 'LOCALITY', 'kolkata', 'Kolkata'),

  // Across the river / periphery — deliberately includes long names so the UI
  // is exercised against realistic worst cases.
  L('howrah', 'Howrah', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('shibpur', 'Shibpur', 'SUB_LOCALITY', 'howrah', 'Howrah, Kolkata'),
  L('uttarpara-kotrung', 'Uttarpara Kotrung', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('barrackpore', 'Barrackpore', 'LOCALITY', 'kolkata', 'Kolkata'),
  L('serampore', 'Serampore', 'LOCALITY', 'kolkata', 'Kolkata'),

  // ---- Societies ------------------------------------------------
  // Development inventory. These are invented building names, not a
  // register of real housing societies in Kolkata.
  // New Town
  S('new-town-upohar-luxury-residences', 'Upohar Luxury Residences', 'new-town', 'New Town, Kolkata'),
  S('new-town-sankalpa-greens', 'Sankalpa Greens', 'new-town', 'New Town, Kolkata'),
  S('new-town-rosedale-garden', 'Rosedale Garden', 'new-town', 'New Town, Kolkata'),
  // Salt Lake
  S('salt-lake-sector-v-residency', 'Sector V Residency', 'salt-lake', 'Salt Lake, Kolkata'),
  S('salt-lake-labony-estate', 'Labony Estate', 'salt-lake', 'Salt Lake, Kolkata'),
  S('salt-lake-purbachal-heights', 'Purbachal Heights', 'salt-lake', 'Salt Lake, Kolkata'),
  // Rajarhat
  S('rajarhat-chinar-park-heights', 'Chinar Park Heights', 'rajarhat', 'Rajarhat, Kolkata'),
  S('rajarhat-greenfield-elegance', 'Greenfield Elegance', 'rajarhat', 'Rajarhat, Kolkata'),
  S('rajarhat-sunrise-symphony', 'Sunrise Symphony', 'rajarhat', 'Rajarhat, Kolkata'),
  // Ballygunge
  S('ballygunge-ballygunge-park-court', 'Ballygunge Park Court', 'ballygunge', 'Ballygunge, Kolkata'),
  S('ballygunge-queens-mansion', 'Queens Mansion', 'ballygunge', 'Ballygunge, Kolkata'),
  S('ballygunge-gurusaday-residency', 'Gurusaday Residency', 'ballygunge', 'Ballygunge, Kolkata'),
  // Tollygunge
  S('tollygunge-tolly-greens', 'Tolly Greens', 'tollygunge', 'Tollygunge, Kolkata'),
  S('tollygunge-deshapriya-court', 'Deshapriya Court', 'tollygunge', 'Tollygunge, Kolkata'),
  S('tollygunge-netaji-enclave', 'Netaji Enclave', 'tollygunge', 'Tollygunge, Kolkata'),
  // Behala
  S('behala-sakuntala-apartments', 'Sakuntala Apartments', 'behala', 'Behala, Kolkata'),
  S('behala-diamond-harbour-residency', 'Diamond Harbour Residency', 'behala', 'Behala, Kolkata'),
  // Garia
  S('garia-garia-green-view', 'Garia Green View', 'garia', 'Garia, Kolkata'),
  S('garia-kavi-nazrul-enclave', 'Kavi Nazrul Enclave', 'garia', 'Garia, Kolkata'),
  // Jadavpur
  S('jadavpur-jadavpur-central-apartments', 'Jadavpur Central Apartments', 'jadavpur', 'Jadavpur, Kolkata'),
  S('jadavpur-sulekha-residency', 'Sulekha Residency', 'jadavpur', 'Jadavpur, Kolkata'),
  // E M Bypass
  S('em-bypass-bypass-greens', 'Bypass Greens', 'em-bypass', 'E M Bypass, Kolkata'),
  S('em-bypass-ruby-park-residency', 'Ruby Park Residency', 'em-bypass', 'E M Bypass, Kolkata'),
  S('em-bypass-avidipta-enclave', 'Avidipta Enclave', 'em-bypass', 'E M Bypass, Kolkata'),
  // Howrah
  S('howrah-shibpur-residency', 'Shibpur Residency', 'howrah', 'Howrah, Kolkata'),
  S('howrah-ganges-view-apartments', 'Ganges View Apartments', 'howrah', 'Howrah, Kolkata'),
  // Dum Dum
  S('dum-dum-nagerbazar-heights', 'Nagerbazar Heights', 'dum-dum', 'Dum Dum, Kolkata'),
  S('dum-dum-dum-dum-park-enclave', 'Dum Dum Park Enclave', 'dum-dum', 'Dum Dum, Kolkata'),
  // Alipore
  S('alipore-alipore-park-place', 'Alipore Park Place', 'alipore', 'Alipore, Kolkata'),
  S('alipore-belvedere-court', 'Belvedere Court', 'alipore', 'Alipore, Kolkata'),
  // Action Area I
  S('new-town-action-area-i-sanjeeva-town', 'Sanjeeva Town', 'new-town-action-area-i', 'Action Area I, Kolkata'),
  S('new-town-action-area-i-uniworld-city', 'Uniworld City', 'new-town-action-area-i', 'Action Area I, Kolkata'),
  // Uttarpara Kotrung
  S('uttarpara-kotrung-kotrung-riverside', 'Kotrung Riverside', 'uttarpara-kotrung', 'Uttarpara Kotrung, Kolkata'),
  S('uttarpara-kotrung-uttarpara-garden-estate', 'Uttarpara Garden Estate', 'uttarpara-kotrung', 'Uttarpara Kotrung, Kolkata'),
]

/** Localities shown as one-tap entry points on the homepage. */
export const POPULAR_LOCALITY_SLUGS = [
  'new-town',
  'salt-lake',
  'rajarhat',
  'ballygunge',
  'tollygunge',
  'behala',
  'garia',
  'jadavpur',
  'em-bypass',
  'howrah',
  'dum-dum',
  'alipore',
] as const
