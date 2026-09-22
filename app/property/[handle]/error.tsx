'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { BRAND, LAUNCH_CITY } from '@/lib/brand'

/**
 * Error boundary for a property page.
 *
 * Says what it does not know rather than guessing. A blank property page is
 * indistinguishable from a removed listing, and those need different
 * responses from the buyer: one is worth retrying, the other is not.
 *
 * A removed listing is NOT this — Phase 18 gives it an HTTP 410 page with
 * alternatives, once a listing lifecycle exists to remove one.
 */
export default function PropertyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Property page failed', error)
  }, [error])

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 lg:px-8">
      <section
        role="alert"
        className="mx-auto max-w-xl rounded-lg border border-border-subtle bg-surface-000 p-6 text-center shadow-e1"
      >
        <span aria-hidden className="mx-auto grid size-11 place-items-center rounded-full bg-danger-100 text-danger-600">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden>
            <path d="M12 8v5M12 17h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </span>
        <h1 className="mt-3 font-display text-heading-3 text-ink-900">
          We could not load this property
        </h1>
        <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-700">
          Something went wrong on our side. We do not know whether this listing is still
          available, so please try again rather than assuming it has been taken down.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Link href={`/buy/${LAUNCH_CITY.slug}`}>
            <Button variant="secondary">Back to search</Button>
          </Link>
        </div>

        {error.digest && (
          <p className="mt-4 text-caption text-ink-500">
            Reference: <span className="tabular">{error.digest}</span>
          </p>
        )}
        <p className="mt-1 text-caption text-ink-500">
          If this keeps happening, contact {BRAND.supportEmail}.
        </p>
      </section>
    </div>
  )
}
