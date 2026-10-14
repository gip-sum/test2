'use client'
import { useEffect } from 'react'

/**
 * Tells the server this listing was viewed, once the page has actually
 * rendered in a browser. A beacon rather than counting the page request:
 * prefetches, crawlers that do not run JavaScript and server-side link
 * previews never reach here. Fire and forget; the page never waits on it.
 */
export function ViewBeacon({ listingId }: { listingId: string }) {
  useEffect(() => {
    const url = `/api/listings/${listingId}/view`
    if (navigator.sendBeacon?.(url)) return
    fetch(url, { method: 'POST', keepalive: true, credentials: 'same-origin' }).catch(() => {})
  }, [listingId])
  return null
}
