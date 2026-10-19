'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/Button'
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
 *
 * A disclosure (UI-13): the shared `text` Button kept to its old look (no
 * underline until hover), 44px tall, named "Read more of the description"
 * so it makes sense out of context, with the state in its words and its
 * chevron as well as in `aria-expanded`. Without JavaScript the button
 * could never open the text, so the `<noscript>` rule shows it all and
 * hides the button.
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
        data-description={long ? '' : undefined}
        className={cn(
          // A reading measure and a little more air (UI-16): seller prose
          // ran the full column at 15px and read as a block.
          'max-w-[68ch] whitespace-pre-line text-body-lg text-ink-700',
          long && !open && 'line-clamp-6',
        )}
      >
        {text}
      </p>
      {long && (
        <>
          <noscript>
            <style>{'[data-description]{display:block!important;-webkit-line-clamp:none!important;overflow:visible!important}[data-description-toggle]{display:none!important}'}</style>
          </noscript>
          <Button
            type="button"
            variant="text"
            data-description-toggle=""
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={id}
            className="mt-2 gap-1 text-label text-brand-700 no-underline hover:underline"
          >
            {open ? 'Show less' : 'Read more'}<span className="sr-only"> of the description</span>
            <svg viewBox="0 0 24 24" className={cn('size-4 transition-transform', open && 'rotate-180')} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </Button>
        </>
      )}
    </div>
  )
}
