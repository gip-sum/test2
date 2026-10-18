'use client'

import { useLinkStatus } from 'next/link'

/**
 * Marks a period link while its page loads (UI-10). A rule in globals.css
 * (`main:has([data-period-pending])`) dims the figures below, holding their
 * frame, the way search dims its results: a period change never blanks the
 * chart or swaps it for a skeleton. Without JavaScript the link is a plain
 * page load and this renders nothing.
 */
export function PeriodPending() {
  const { pending } = useLinkStatus()
  return pending ? <span data-period-pending aria-hidden /> : null
}
