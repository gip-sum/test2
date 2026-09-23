'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/cn'
import type { PropertyMedia } from '@/lib/property/types'

/**
 * The listing gallery.
 *
 * Phase 4 delivers a working viewer: strip, previous/next, counter,
 * keyboard. Phase 5 owns the media SYSTEM — full-screen, swipe gestures,
 * video, floor plans and responsive sources — so this stays deliberately
 * small rather than half-building that.
 *
 * Three things that are easy to get wrong and are handled here:
 *
 * ASPECT RATIO IS RESERVED. The 4:3 box exists before any image loads,
 * which is most of how cumulative layout shift stays under 0.05 on a page
 * whose largest element is an image.
 *
 * THE COUNT IS ANNOUNCED, NOT JUST DRAWN. Changing image is a change of
 * content with no change of focus, so a sighted user sees "3 of 12" update
 * and a screen-reader user would get nothing at all. The live region is
 * what makes those two experiences the same.
 *
 * FOCUS SURVIVES. Previous/next keep focus on the button that was pressed,
 * so holding an arrow key works and nothing is thrown back to the top of
 * the page.
 *
 * With one image there is no strip, no counter and no navigation — §5.
 * With none there is no gallery at all, only the placeholder.
 */
export function Gallery({ photos, title }: { photos: PropertyMedia[]; title: string }) {
  const [index, setIndex] = useState(0)
  const frameRef = useRef<HTMLDivElement>(null)

  const usable = photos.filter((p) => p.url)
  const count = usable.length
  const multi = count > 1

  if (count === 0) return <EmptyMedia title={title} />

  const current = usable[Math.min(index, count - 1)]!
  const go = (next: number) => setIndex((next + count) % count)

  return (
    <section aria-label="Property photos" className="min-w-0">

      <div
        ref={frameRef}
        // The whole frame is focusable so arrow keys work without first
        // tabbing to a specific button.
        tabIndex={multi ? 0 : -1}
        role={multi ? 'group' : undefined}
        aria-roledescription={multi ? 'carousel' : undefined}
        aria-label={multi ? `Photos of ${title}` : undefined}
        onKeyDown={(e) => {
          if (!multi) return
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            go(index + 1)
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            go(index - 1)
          }
        }}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-media-ground lg:aspect-[16/10]"
      >
        <Image
          key={current.id}
          src={current.url!}
          alt={current.alt}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 760px, 100vw"
          className="object-cover"
        />

        {/* Baked into every generated file as well, but stated here too so
            the claim is made by the interface and not only by the pixels. */}
        <p className="absolute left-3 top-3 rounded-sm bg-ink-900/85 px-2 py-1 text-caption font-semibold text-ink-inverse">
          Sample image — not a real property
        </p>

        {multi && (
          <>
            <NavButton side="left" onClick={() => go(index - 1)} label="Previous photo" />
            <NavButton side="right" onClick={() => go(index + 1)} label="Next photo" />
            <p className="absolute bottom-3 right-3 rounded-full bg-ink-900/85 px-2.5 py-1 text-caption font-semibold text-ink-inverse tabular">
              {index + 1} / {count}
            </p>
          </>
        )}
      </div>

      {/* The announcement channel. Visually redundant with the counter
          above; not redundant at all to a screen reader. */}
      <p role="status" aria-live="polite" className="sr-only">
        {multi ? `Image ${index + 1} of ${count}. ${current.alt}` : current.alt}
      </p>

      {multi && (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {usable.map((photo, i) => (
            <li key={photo.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1} of ${count}`}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  'relative block h-16 w-22 overflow-hidden rounded-md border-2 transition-colors',
                  i === index ? 'border-brand-600' : 'border-transparent hover:border-border-strong',
                )}
              >
                <Image src={photo.url!} alt="" fill sizes="88px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function NavButton({
  side,
  onClick,
  label,
}: {
  side: 'left' | 'right'
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full',
        'bg-surface-000/95 text-ink-900 shadow-e2 hover:bg-surface-000',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={side === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  )
}

/**
 * No photo is a common and legitimate state, especially for owner
 * listings. It must read as "this seller has not added photos", never as a
 * failed image or a broken page.
 */
function EmptyMedia({ title }: { title: string }) {
  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-media-ground lg:aspect-[16/10]"
      role="img"
      aria-label={`${title} — the seller has not added photos`}
    >
      <svg viewBox="0 0 120 90" className="size-full text-brand-600" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width="120" height="90" className="fill-media-ground" />
        <rect x="14" y="30" width="26" height="60" fill="currentColor" opacity="0.16" />
        <rect x="44" y="16" width="32" height="74" fill="currentColor" opacity="0.26" />
        <rect x="80" y="40" width="28" height="50" fill="currentColor" opacity="0.12" />
        <rect x="50" y="26" width="6" height="6" className="fill-surface-000" opacity="0.5" />
        <rect x="62" y="26" width="6" height="6" className="fill-surface-000" opacity="0.5" />
        <rect x="50" y="40" width="6" height="6" className="fill-surface-000" opacity="0.5" />
        <rect x="62" y="40" width="6" height="6" className="fill-surface-000" opacity="0.5" />
      </svg>
      <p className="absolute bottom-3 left-3 rounded-sm bg-surface-000/90 px-2 py-1 text-caption text-ink-700">
        The seller has not added photos yet
      </p>
    </div>
  )
}
