import type { LocalityCentre } from './types'

/**
 * Where each Kolkata locality is, for the map on Search (UI-21).
 *
 * One point per LOCALITY, never per home: the map places a listing no more
 * precisely than the locality its card already names. Sub-localities and
 * societies are drawn at their locality's point, so a home in Action Area I
 * appears as New Town, exactly as precise as "New Town" in text.
 *
 * Every point is a published record, cited below, not a guess:
 *
 *  - `india-post` — the post office named for the locality, from the India
 *    Post pincode directory as published on data.gov.in (Government Open
 *    Data Licence – India; attribution required), read from the copy in
 *    the `india-pincode` npm package 2.5.9. The reference is the PIN and
 *    the office name.
 *  - `geonames` — GeoNames (CC BY 4.0; attribution required), read from
 *    the `cities.json` 1.1.65 and `postalcodes-india` 1.2.0 npm packages.
 *    Used where the post office record is missing or fails the checks
 *    below.
 *
 * A record is used only if it passes all of these:
 *  1. It is not a placeholder. The directory gives several unrelated
 *     offices one shared point (Kasba, Bhawanipore and Bidhangarh all
 *     read 22.5727778, 88.3475; most Howrah offices share 22.5816944,
 *     88.3371944), so a point shared by offices in different places is
 *     rejected.
 *  2. It agrees with a second record within about 3 km, either the other
 *     source or another office in the same locality, or it stands alone
 *     with full precision. Two-decimal points (22.77, 88.34) give way to a
 *     more precise record.
 *  3. It lies inside the Kolkata area the posting form accepts.
 *
 * A post office is not the geometric centre of its area, so every point is
 * labelled "approximate area" wherever it is shown. Before launch, each
 * should be checked against OpenStreetMap (the map's own basemap). That
 * check could not be made while this was built, because the map hosts were
 * unreachable from the build environment. See UI-21's record.
 *
 * Localities with NO point are listed in UNPLACED with the reason. Their
 * homes stay in the list and are counted on the map as "not on the map".
 * They are never dropped at the city centre or a neighbour's point.
 */
export const LOCALITY_CENTRES: Record<string, LocalityCentre> = {
  // North-east / Rajarhat corridor
  'new-town': { lat: 22.5760376, lng: 88.4718303, source: 'india-post', reference: '700156 New Town SO' },
  rajarhat: { lat: 22.6313621, lng: 88.4846499, source: 'india-post', reference: '700135 Rajarhat SO' },
  'salt-lake': { lat: 22.5910577, lng: 88.4128297, source: 'india-post', reference: '700091 Sech Bhawan SO' },
  'lake-town': { lat: 22.6067999, lng: 88.4009964, source: 'india-post', reference: '700089 Lake Town SO' },
  'dum-dum': { lat: 22.6321944, lng: 88.4161111, source: 'india-post', reference: '700028 Dumdum SO' },
  madhyamgram: { lat: 22.6938334, lng: 88.4609913, source: 'india-post', reference: '700129 Madhyamgram SO' },
  barasat: { lat: 22.7148951, lng: 88.4827494, source: 'india-post', reference: '700124 Barasat HO' },

  // South
  ballygunge: { lat: 22.5313611, lng: 88.3652778, source: 'india-post', reference: '700019 Ballygunge SO' },
  tollygunge: { lat: 22.5067222, lng: 88.3452222, source: 'india-post', reference: '700033 Tollygunge HO' },
  jadavpur: { lat: 22.4977778, lng: 88.3703056, source: 'india-post', reference: '700032 Jadavpur University SO' },
  garia: { lat: 22.47265, lng: 88.37986, source: 'india-post', reference: '700084 Garia SO' },
  behala: { lat: 22.4940555, lng: 88.3165555, source: 'india-post', reference: '700034 Behala SO' },
  alipore: { lat: 22.52575, lng: 88.3377222, source: 'india-post', reference: '700027 Alipore HO' },
  santoshpur: { lat: 22.4916389, lng: 88.3836111, source: 'india-post', reference: '700075 Santoshpur SO' },
  narendrapur: { lat: 22.44489, lng: 88.39346, source: 'india-post', reference: '700103 Narendrapur SO' },
  // The Sonarpur office's point (22.34175, 88.4290833) is about 10 km from
  // both GeoNames records for Sonarpur, so the GeoNames point is used.
  sonarpur: { lat: 22.4382, lng: 88.43205, source: 'geonames', reference: 'Rajpur Sonarpur (cities1000)' },
  joka: { lat: 22.453066, lng: 88.302505, source: 'india-post', reference: '700104 Joka SO' },
  thakurpukur: { lat: 22.4646666, lng: 88.3072777, source: 'india-post', reference: '700063 Thakurpukur SO' },

  // Central / north
  'park-street': { lat: 22.552, lng: 88.3539167, source: 'india-post', reference: '700016 Park Street HO' },
  maniktala: { lat: 22.5842222, lng: 88.37725, source: 'india-post', reference: '700006 Manicktala SO' },
  shyambazar: { lat: 22.5977222, lng: 88.3717777, source: 'india-post', reference: '700004 Shyambazar Mail SO' },
  // "Ultadanga SO" is given only to two decimals (22.58, 88.35), so the
  // Main Road office's full-precision point is used.
  ultadanga: { lat: 22.594, lng: 88.3843888, source: 'india-post', reference: '700067 Ultadanga Main Road SO' },

  // Across the river / periphery
  // Howrah's offices share one placeholder point, so the GeoNames city point is used.
  howrah: { lat: 22.57688, lng: 88.31857, source: 'geonames', reference: 'Howrah (cities1000)' },
  'uttarpara-kotrung': { lat: 22.6552778, lng: 88.3480556, source: 'india-post', reference: '712258 Uttarpara SO' },
  // Barrackpore's offices are given only to two decimals.
  barrackpore: { lat: 22.76602, lng: 88.36336, source: 'geonames', reference: 'Barrackpore (cities1000)' },
  serampore: { lat: 22.7573056, lng: 88.3423611, source: 'india-post', reference: '712201 Serampore HO' },
}

/** Localities with no published point that passes the checks above, and why. */
export const UNPLACED: Record<string, string> = {
  baguiati: 'The directory places the Baguiati Super Market office more than 30 km away, in South 24 Parganas.',
  kestopur: 'No office or GeoNames record is named for it.',
  bhowanipore: 'The office shares a placeholder point with unrelated offices.',
  kasba: 'The office shares a placeholder point with unrelated offices; GeoNames gives only an estimate.',
  'em-bypass': 'A road running across the east of the city, not an area: no single point stands for it.',
  beliaghata: 'No office in the locality is listed; "Beliaghata Bridge" is elsewhere, in North 24 Parganas.',
}

/** Who to credit, wherever an area position is shown. */
export const CENTRE_ATTRIBUTION = 'Area positions: India Post directory (data.gov.in, GODL-India), GeoNames (CC BY 4.0)'
