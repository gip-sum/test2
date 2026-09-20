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
