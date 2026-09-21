'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { BRAND, LAUNCH_CITY } from '@/lib/brand'

/**
 * Error boundary UI for the results routes.
 *
 * Two things matter when a search fails. The user's filters are not lost —
 * "Try again" re-runs the SAME URL, so a transient failure costs a tap
 * rather than twelve filter selections. And the page says what it does not
 * know rather than guessing: an empty grid with no explanation is
 * indistinguishable from a search that legitimately matched nothing, and
 * those two need completely different responses from the user.
 */
export function SearchErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Phase 5 wires this to real error reporting. Until then the console is
    // the only sink, and swallowing it would hide real defects.
    console.error('Search failed', error)
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
          We could not load these results
        </h1>
        <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-700">
          Something went wrong on our side, so we do not know how many properties match your
          filters. Your filters are still in the address bar — trying again re-runs exactly the
          same search.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Link href={`/buy/${LAUNCH_CITY.slug}`}>
            <Button variant="secondary">Start a new search</Button>
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
