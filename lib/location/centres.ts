import type { LocalityCentre } from './types'

/**
 * Where each Kolkata locality is, for the map on Search (UI-21).
 *
 * One point per LOCALITY, never per home: the map places a listing no more
 * precisely than the locality its card already names. Sub-localities and
 * societies are drawn at their locality's point.
 *
 * Every point is a published record, never a guess: `india-post` is the
 * post office named for the locality (India Post pincode directory,
 * data.gov.in, GODL-India), `geonames` a GeoNames record (CC BY 4.0). Each
 * was cross-checked against a second, independent reference and kept only
 * within 2 km of it; centres.test.ts holds those reference points and fails
 * if a point drifts. Uncertain means unplaced (UNPLACED, with the reason),
 * never approximated. Provenance, distances and the check still owed
 * against OpenStreetMap: docs/data/locality-centres.md.
 */
export const LOCALITY_CENTRES: Record<string, LocalityCentre> = {
  // North-east
  'new-town': { lat: 22.5760376, lng: 88.4718303, source: 'india-post', reference: '700156 New Town SO' },
  'salt-lake': { lat: 22.5910577, lng: 88.4128297, source: 'india-post', reference: '700091 Sech Bhawan SO' },
  'lake-town': { lat: 22.6067999, lng: 88.4009964, source: 'india-post', reference: '700089 Lake Town SO' },
  'dum-dum': { lat: 22.6321944, lng: 88.4161111, source: 'india-post', reference: '700028 Dumdum SO' },
  madhyamgram: { lat: 22.6938334, lng: 88.4609913, source: 'india-post', reference: '700129 Madhyamgram SO' },
  barasat: { lat: 22.7148951, lng: 88.4827494, source: 'india-post', reference: '700124 Barasat HO' },

  // South
  ballygunge: { lat: 22.5313611, lng: 88.3652778, source: 'india-post', reference: '700019 Ballygunge SO' },
  tollygunge: { lat: 22.5067222, lng: 88.3452222, source: 'india-post', reference: '700033 Tollygunge HO' },
  jadavpur: { lat: 22.4977778, lng: 88.3703056, source: 'india-post', reference: '700032 Jadavpur University SO' },
  garia: { lat: 22.4632, lng: 88.3979, source: 'geonames', reference: 'Garia (South 24 Parganas), postal 700084' },
  behala: { lat: 22.4940555, lng: 88.3165555, source: 'india-post', reference: '700034 Behala SO' },
  alipore: { lat: 22.52575, lng: 88.3377222, source: 'india-post', reference: '700027 Alipore HO' },
  santoshpur: { lat: 22.4916389, lng: 88.3836111, source: 'india-post', reference: '700075 Santoshpur SO' },
  narendrapur: { lat: 22.44489, lng: 88.39346, source: 'india-post', reference: '700103 Narendrapur SO' },
  sonarpur: { lat: 22.4382, lng: 88.43205, source: 'geonames', reference: 'Rajpur Sonarpur (cities1000)' },
  joka: { lat: 22.453066, lng: 88.302505, source: 'india-post', reference: '700104 Joka SO' },
  thakurpukur: { lat: 22.4646666, lng: 88.3072777, source: 'india-post', reference: '700063 Thakurpukur SO' },

  // Central / north
  'park-street': { lat: 22.552, lng: 88.3539167, source: 'india-post', reference: '700016 Park Street HO' },
  maniktala: { lat: 22.5842222, lng: 88.37725, source: 'india-post', reference: '700006 Manicktala SO' },
  shyambazar: { lat: 22.5977222, lng: 88.3717777, source: 'india-post', reference: '700004 Shyambazar Mail SO' },
  ultadanga: { lat: 22.594, lng: 88.3843888, source: 'india-post', reference: '700067 Ultadanga Main Road SO' },

  // Across the river / periphery
  howrah: { lat: 22.57688, lng: 88.31857, source: 'geonames', reference: 'Howrah (cities1000)' },
  'uttarpara-kotrung': { lat: 22.6608, lng: 88.3471, source: 'geonames', reference: 'Uttarpara, postal 712258' },
  barrackpore: { lat: 22.76602, lng: 88.36336, source: 'geonames', reference: 'Barrackpore (cities1000)' },
  serampore: { lat: 22.7573056, lng: 88.3423611, source: 'india-post', reference: '712201 Serampore HO' },
}

/** Localities with no published point that passes the checks above, and why. */
export const UNPLACED: Record<string, string> = {
  baguiati: 'The directory places the Baguiati Super Market office more than 30 km away, in South 24 Parganas.',
  kestopur: 'No office or GeoNames record is named for it.',
  bhowanipore: 'The office shares a placeholder point with unrelated offices.',
  rajarhat: 'The sources disagree by up to 4.6 km: the post office is in the old village to the east, GeoNames and the reference point further west.',
  kasba: 'The office shares a placeholder point with unrelated offices; GeoNames gives only an estimate.',
  'em-bypass': 'A road running across the east of the city, not an area: no single point stands for it.',
  beliaghata: 'No office in the locality is listed; "Beliaghata Bridge" is elsewhere, in North 24 Parganas.',
}

/** Who to credit, wherever an area position is shown. */
export const CENTRE_ATTRIBUTION = 'Area positions: India Post directory (data.gov.in, GODL-India), GeoNames (CC BY 4.0)'
