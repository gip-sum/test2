'use client'

import { useId, useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * The seller's own words.
 *
 * Clamped, because two thousand characters between the specification grid
 * and the amenities pushes everything a buyer is scanning for below the
 * fold. Expanded by a real button with `aria-expanded`, because a
 * CSS-only clamp hides text from sighted users while leaving it in the
 * accessibility tree — the two groups then disagree about what is on the
 * page.
 *
 * The collapsed text stays in the DOM and stays selectable and findable by
 * the browser's own find-in-page. Truncating the string instead would make
 * Ctrl+F fail on text the page claims to contain.
 */
const CLAMP_THRESHOLD = 420

export function DescriptionBlock({ text }: { text: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const long = text.length > CLAMP_THRESHOLD

  return (
    <div>
      <p
        id={id}
        className={cn(
          'whitespace-pre-line text-body text-ink-700',
          long && !open && 'line-clamp-6',
        )}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
          className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-md text-label text-brand-600 hover:underline"
        >
          {open ? 'Show less' : 'Read more'}
          <svg viewBox="0 0 24 24" className={cn('size-4 transition-transform', open && 'rotate-180')} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  )
}
