/**
 * Listing freshness.
 *
 * Recency is a strong quality proxy for buyers, so it appears on every
 * card. Rendered on the server: a client-side clock would disagree with
 * the server's and produce a hydration mismatch.
 */
export function formatPostedAt(isoDate: string, now = new Date()): string {
  const posted = new Date(isoDate)
  if (Number.isNaN(posted.getTime())) return ''

  const days = Math.floor((now.getTime() - posted.getTime()) / 86_400_000)
  if (days <= 0) return 'Posted today'
  if (days === 1) return 'Posted yesterday'
  if (days < 7) return `Posted ${days} days ago`
  if (days < 14) return 'Posted last week'
  if (days < 60) return `Posted ${Math.floor(days / 7)} weeks ago`
  return `Posted ${Math.floor(days / 30)} months ago`
}

/** A listing is "new" for its first week. */
export function isNewListing(isoDate: string, now = new Date()): boolean {
  const posted = new Date(isoDate)
  if (Number.isNaN(posted.getTime())) return false
  return now.getTime() - posted.getTime() < 7 * 86_400_000
}
