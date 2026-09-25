'use client'

import { useEffect, useRef } from 'react'

/**
 * The one client component in the posting flow.
 *
 * Focus moves here on load so a keyboard or screen-reader user lands on the
 * list of problems instead of the top of a long page. Without JavaScript it
 * is still the first thing in the form, so nothing depends on this effect.
 */
export function ErrorSummary({ errors }: { errors: { id: string; message: string }[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby="error-summary-title" className="post-error-summary rounded-lg border-2 border-danger-600 bg-surface-000 p-5 sm:p-6">
      <h2 id="error-summary-title" className="font-display text-heading-3 text-ink-900">There is a problem</h2>
      <p className="mt-1 text-body-sm text-ink-700">{errors.length === 1 ? 'One answer needs' : `${errors.length} answers need`} attention before you continue.</p>
      <ul className="mt-3 space-y-2">
        {errors.map((error) => (
          <li key={error.id}>
            <a href={`#${error.id}`} className="inline-flex min-h-6 text-body-sm font-semibold text-danger-600 underline underline-offset-4">{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
