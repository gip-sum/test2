import { createHash } from 'node:crypto'

/**
 * What a "view" is (Phase 20), in one place.
 *
 * One view per browser per listing per India day. The browser is a random
 * first-party cookie, set by the proxy when the listing page is served; it
 * identifies nothing about the person. The database stores only a hash of
 * that id together with the listing and the day, so a stored mark cannot be
 * joined to another day or another listing. A browser that refuses cookies
 * never presents one, and is not counted, which errs toward fewer views
 * rather than counting the same person on every visit.
 */
export { VISITOR_COOKIE, VISITOR_ID, VISITOR_MAX_AGE } from './visitor'

// Known crawlers and link-preview fetchers. Most never run the beacon's
// JavaScript at all; this catches the ones that do. A missing user agent is
// treated as automated: every browser sends one.
const AUTOMATED = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|embedly|preview|lighthouse|pagespeed|curl|wget|python-requests|axios|node-fetch/i
export function isAutomated(userAgent: string | null | undefined): boolean {
  return !userAgent || AUTOMATED.test(userAgent)
}

export function visitorKey(visitorId: string, listingId: string, day: string): string {
  return createHash('sha256').update(`${visitorId}:${listingId}:${day}`).digest('hex')
}
